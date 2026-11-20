import json
import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from functools import wraps
from time import monotonic
from urllib.parse import urlsplit

import httpx
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

from .agent import INSTRUCTIONS, interpret
from .errors import AIError


@dataclass(frozen=True, repr=False)
class Provider:
    kind: str
    model: str
    base_url: str
    api_key: str
    input_rate: Decimal
    output_rate: Decimal
    temperature: float | None

    @property
    def label(self):
        return f"{self.kind}/{self.model}"

    def cost(self, input_tokens, output_tokens):
        return int(
            (
                self.input_rate * input_tokens + self.output_rate * output_tokens
            ).to_integral_value(rounding=ROUND_CEILING)
        )


@dataclass(frozen=True)
class Limits:
    user_daily: int
    org_daily: int
    org_budget: int
    user_budget: int
    timeout: int
    max_output: int
    max_input_bytes: int
    max_tools: int

    @property
    def calls_per_provider(self):
        return self.max_tools + 2


def option(name, default=""):
    return settings.REALINOVA.get(name, default)


def enabled(name):
    return str(option(name, "false")).lower() in {"true", "1"}


def limits():
    options = (
        ("DAILY_REQUEST_LIMIT", 25, 1000),
        ("ORG_DAILY_REQUEST_LIMIT", 250, 100000),
        ("ORG_DAILY_BUDGET_MICROUSD", 10_000_000, 10**12),
        ("USER_DAILY_BUDGET_MICROUSD", 1_000_000, 10**12),
        ("REQUEST_TIMEOUT_SECONDS", 25, 90),
        ("MAX_OUTPUT_TOKENS", 256, 4096),
        ("MAX_INPUT_BYTES", 24000, 100000),
        ("MAX_TOOL_CALLS", 6, 10),
    )
    try:
        values = [int(option(key, default)) for key, default, _ in options]
        if not all(
            1 <= value <= bound for value, (_, _, bound) in zip(values, options)
        ):
            raise ValueError
        return Limits(*values)
    except (TypeError, ValueError):
        raise AIError("AI_PROVIDER_UNAVAILABLE") from None


def provider(prefix):
    kind = option(prefix + "PROVIDER")
    model = option(prefix + "MODEL")
    api_key = option(prefix + "API_KEY")
    url = option(prefix + "BASE_URL") or (
        "https://api.openai.com/v1" if kind == "openai" else ""
    )
    try:
        parsed = urlsplit(url)
        if (
            kind not in {"openai", "openai_compatible"}
            or not model
            or len(model) > 120
            or not api_key
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or (
                parsed.scheme != "https"
                and not (
                    settings.DEBUG
                    and parsed.scheme == "http"
                    and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
                )
            )
        ):
            raise ValueError
        rates = [
            Decimal(option(prefix + field))
            for field in ("INPUT_USD_PER_MTOK", "OUTPUT_USD_PER_MTOK")
        ]
        if any(not rate.is_finite() or not 0 <= rate <= 1000 for rate in rates):
            raise ValueError
        temperature = option(prefix + "TEMPERATURE")
        temperature = float(temperature) if temperature else None
        if temperature is not None and not 0 <= temperature <= 2:
            raise ValueError
        return Provider(kind, model, url, api_key, *rates, temperature)
    except (ValueError, TypeError, InvalidOperation):
        raise AIError("AI_PROVIDER_UNAVAILABLE") from None


def configured_providers():
    if not enabled("ENABLED"):
        raise AIError("AI_PROVIDER_UNAVAILABLE")
    primary = provider("")
    if not enabled("FALLBACK_ENABLED"):
        return [primary]
    alternate = provider("FALLBACK_")
    if (primary.base_url, primary.model) == (alternate.base_url, alternate.model):
        raise AIError("AI_PROVIDER_UNAVAILABLE")
    return [primary, alternate]


def reserved_cost(providers, config):
    return sum(
        config.calls_per_provider * item.cost(config.max_input_bytes, config.max_output)
        for item in providers
    )


class ProviderUsage:
    def __init__(self, deadline, config, tools, model):
        self.deadline = deadline
        self.config = config
        self.tools = tools
        self.model = model
        self.calls = 0
        self.measured = 0
        self.tokens_in = 0
        self.tokens_out = 0
        self.error_code = None

    def before_send(self, request):
        try:
            self.tools.scope.fresh()
            remaining = self.deadline - monotonic()
            if remaining <= 0:
                raise AIError("AI_TIMEOUT")
            if (
                self.calls >= self.config.calls_per_provider
                or len(request.content) > self.config.max_input_bytes
            ):
                raise AIError("AI_PROVIDER_INVALID_RESPONSE")
            timeout = min(remaining, 12)
            request.extensions["timeout"] = httpx.Timeout(
                timeout, connect=min(4, timeout)
            ).as_dict()
            self.calls += 1
        except AIError as exc:
            self.error_code = exc.code
            raise

    def after_response(self, response):
        if response.status_code >= 400:
            self.error_code = {
                401: "AI_PROVIDER_AUTH_FAILED",
                403: "AI_PROVIDER_AUTH_FAILED",
                408: "AI_TIMEOUT",
                429: "AI_PROVIDER_RATE_LIMITED",
                504: "AI_TIMEOUT",
            }.get(
                response.status_code,
                "AI_PROVIDER_UNAVAILABLE"
                if response.status_code >= 500
                else "AI_PROVIDER_INVALID_RESPONSE",
            )
            return
        try:
            response.read()
            usage = response.json().get("usage") or {}
            counts = [usage.get(key) for key in ("prompt_tokens", "completion_tokens")]
        except (ValueError, AttributeError):
            return
        if all(type(count) is int and 0 <= count <= 10**8 for count in counts):
            self.tokens_in += counts[0]
            self.tokens_out += counts[1]
            self.measured += 1

    @property
    def charge(self):
        observed = self.model.cost(self.tokens_in, self.tokens_out)
        unknown = self.model.cost(self.config.max_input_bytes, self.config.max_output)
        return observed + (self.calls - self.measured) * unknown


def json_tool(method):
    @wraps(method)
    def invoke(*args, **kwargs):
        return json.dumps(
            method(*args, **kwargs),
            cls=DjangoJSONEncoder,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    return invoke


def perform(question, recent_questions, tools, providers, config, attempts):
    try:
        from agno.agent import Agent
        from agno.models.openai import OpenAIChat
    except ImportError:
        raise AIError("AI_PROVIDER_UNAVAILABLE") from None
    # The SDK may include upstream response bodies in error and debug logs.
    for name in ("agno", "agno-agno", "openai", "openai._base_client"):
        logging.getLogger(name).disabled = True
    deadline = monotonic() + config.timeout
    for model in providers:
        if monotonic() >= deadline:
            raise AIError("AI_TIMEOUT")
        usage = ProviderUsage(deadline, config, tools, model)
        attempts.append(usage)
        tools.evidence.clear()
        prompt = json.dumps(
            {
                "question": question,
                "previous_questions": recent_questions,
                "as_of": timezone.localdate(),
                "selected_school_id": tools.scope.school_id,
            },
            cls=DjangoJSONEncoder,
            ensure_ascii=False,
        )
        try:
            with httpx.Client(
                trust_env=False,
                follow_redirects=False,
                event_hooks={
                    "request": [usage.before_send],
                    "response": [usage.after_response],
                },
            ) as client:
                agent = Agent(
                    name="RealInova",
                    description="Assistente de indicadores da merenda escolar.",
                    instructions=INSTRUCTIONS,
                    model=OpenAIChat(
                        id=model.model,
                        base_url=model.base_url,
                        api_key=model.api_key,
                        http_client=client,
                        timeout=min(config.timeout, 12),
                        max_retries=0,
                        store=False,
                        max_completion_tokens=config.max_output,
                        temperature=model.temperature,
                        role_map={**OpenAIChat.default_role_map, "system": "system"}
                        if model.kind == "openai_compatible"
                        else None,
                    ),
                    tools=[json_tool(tool) for tool in tools.available()],
                    tool_call_limit=config.max_tools,
                    retries=0,
                    telemetry=False,
                    debug_mode=False,
                    add_history_to_context=False,
                    markdown=False,
                )
                output = agent.run(prompt, stream=False)
                if usage.error_code:
                    raise AIError(usage.error_code)
                if monotonic() >= deadline:
                    raise AIError("AI_TIMEOUT")
                return interpret(output.content, tools)
        except AIError as exc:
            error = exc
        except Exception as exc:
            error = classify_failure(exc, usage.error_code)
        if error.code not in {
            "AI_TIMEOUT",
            "AI_PROVIDER_UNAVAILABLE",
            "AI_PROVIDER_RATE_LIMITED",
        }:
            raise error from None
    raise error from None


def classify_failure(exc, hinted_code):
    if hinted_code:
        return AIError(hinted_code)
    current = exc
    for _ in range(6):
        if (
            isinstance(current, (TimeoutError, httpx.TimeoutException))
            or type(current).__name__ == "APITimeoutError"
        ):
            return AIError("AI_TIMEOUT")
        current = current.__cause__ or current.__context__
        if current is None:
            break
    return AIError("AI_PROVIDER_UNAVAILABLE")
