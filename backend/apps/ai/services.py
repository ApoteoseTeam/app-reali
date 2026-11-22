import json
import logging
from datetime import datetime, time, timedelta
from time import monotonic

from django.core.serializers.json import DjangoJSONEncoder
from django.db import DatabaseError, transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.crypto import salted_hmac

from apps.api.audit import audit
from apps.api.permissions import ROLE_PERMISSIONS
from apps.institutions.models import Organization
from apps.users.models import Membership, User

from .agent import direct_answer, direct_intent
from .authorization import user_scope
from .errors import AIError
from .models import AIConversation, AIExecution, AIMessage, ExecutionStatus
from .provider import configured_providers, enabled, limits, perform, reserved_cost
from .tools import QueryTools

logger = logging.getLogger(__name__)
LEASE_SECONDS = 180
HISTORY_QUESTIONS = 3
HISTORY_MAX_CHARS = 3000


def lock_organization(scope):
    if (
        not Organization.objects.select_for_update(no_key=True)
        .filter(pk=scope.organization_id, is_active=True)
        .first()
    ):
        raise AIError("AI_PERMISSION_DENIED")
    return user_scope(
        scope.user_id,
        scope.organization_id,
        scope.session_version,
        session_id=scope.session_id,
    )


def owned_conversation(scope, pk, *, readable=True):
    conversation = scope.conversations(readable=readable).filter(pk=pk).first()
    if not conversation:
        raise AIError("AI_CONVERSATION_NOT_FOUND")
    return conversation


def create_conversation(scope, title="Nova conversa"):
    return AIConversation.objects.create(
        user_id=scope.user_id,
        organization_id=scope.organization_id,
        school_id=scope.school_id,
        access_role=scope.role,
        scope_key=scope.key,
        title=title,
    )


def expire_execution(execution, at):
    if execution.status != ExecutionStatus.PENDING:
        return
    execution.status = ExecutionStatus.FAILED
    execution.error_code = "AI_TIMEOUT"
    execution.completed_at = at
    execution.save(update_fields=["status", "error_code", "completed_at", "updated_at"])
    execution.messages.filter(role=AIMessage.Role.ASSISTANT).update(
        status=ExecutionStatus.FAILED,
        error_code="AI_TIMEOUT",
        completed_at=at,
        updated_at=at,
    )


def running_execution(conversation, at):
    run = AIExecution.objects.filter(
        conversation=conversation, status=ExecutionStatus.PENDING
    ).first()
    if run and run.created_at <= at - timedelta(seconds=LEASE_SECONDS):
        expire_execution(run, at)
        return None
    return run


@transaction.atomic
def change_conversation(scope, pk, data=None):
    live = lock_organization(scope)
    row = owned_conversation(live, pk, readable=data is not None)
    if running_execution(row, timezone.now()):
        raise AIError("AI_CONVERSATION_BUSY")
    if data is None:
        audit(
            "AI_CONVERSATION_DELETED",
            row,
            actor=User.objects.get(pk=scope.user_id),
            organization=row.organization,
        )
        row.delete()
        return None
    for field, value in data.items():
        setattr(row, field, value)
    row.save(update_fields=[*data, "updated_at"])
    return row


def totals(scope, day):
    mine = Q(user_id=scope.user_id)
    return AIExecution.objects.filter(
        organization_id=scope.organization_id, usage_day=day
    ).aggregate(
        org_requests=Count("pk"),
        org_charge=Sum("charged_microusd", default=0),
        user_requests=Count("pk", filter=mine),
        user_charge=Sum("charged_microusd", filter=mine, default=0),
        measured_input=Sum("input_tokens", filter=mine),
        measured_output=Sum("output_tokens", filter=mine),
        incomplete_runs=Count("pk", filter=mine & Q(token_usage_complete=False)),
    )


def usage_summary(scope):
    config = limits()
    day = timezone.localdate()
    values = totals(scope, day)
    access = Membership.objects.filter(
        pk=scope.member_id, all_schools_access=True
    ).exists()
    return {
        "reference_date": day,
        "requests": values["user_requests"],
        "request_limit": config.user_daily,
        "charged_microusd": values["user_charge"],
        "budget_microusd": config.user_budget,
        "input_tokens": values["measured_input"],
        "output_tokens": values["measured_output"],
        "incomplete_token_runs": values["incomplete_runs"],
        "organization": {
            "requests": values["org_requests"],
            "request_limit": config.org_daily,
            "charged_microusd": values["org_charge"],
            "budget_microusd": config.org_budget,
        }
        if access and scope.role in ROLE_PERMISSIONS["config"]
        else None,
    }


def signature(data):
    keys = ("message", "conversation_id", "school_id")
    signed = json.dumps(
        [data.get(key) for key in keys], cls=DjangoJSONEncoder, ensure_ascii=False
    )
    return salted_hmac("realinova-request", signed, algorithm="sha256").hexdigest()


@transaction.atomic
def reserve(scope, data, intent, config):
    live = lock_organization(scope)
    now = timezone.now()
    request_id = data.get("client_request_id")
    request_signature = signature(data) if request_id else ""
    if request_id:
        previous = AIExecution.objects.filter(
            user_id=live.user_id,
            organization_id=live.organization_id,
            client_request_id=request_id,
        ).first()
        if previous:
            if previous.request_signature != request_signature:
                raise AIError("AI_REQUEST_CONFLICT")
            owned_conversation(live, previous.conversation_id)
            if (
                previous.status == ExecutionStatus.PENDING
                and previous.created_at <= now - timedelta(seconds=LEASE_SECONDS)
            ):
                expire_execution(previous, now)
            return previous, None, None, None
    if not enabled("ENABLED"):
        raise AIError("AI_PROVIDER_UNAVAILABLE")
    conversation = None
    school_id = data.get("school_id")
    if "conversation_id" in data:
        conversation = owned_conversation(live, data["conversation_id"])
        if school_id and school_id != conversation.school_id:
            raise AIError("AI_PERMISSION_DENIED")
        if conversation.status != AIConversation.Status.ACTIVE:
            raise AIError("AI_CONVERSATION_ARCHIVED")
        if running_execution(conversation, now):
            raise AIError("AI_CONVERSATION_BUSY")
        school_id = conversation.school_id
    bound = live.bind(school_id)
    providers = [] if intent else configured_providers()
    reserve_cost = reserved_cost(providers, config)
    day = timezone.localdate(now)
    values = totals(live, day)
    retry_after = max(
        1,
        int(
            (
                timezone.make_aware(datetime.combine(day + timedelta(days=1), time.min))
                - now
            ).total_seconds()
        ),
    )
    if (
        values["user_requests"] >= config.user_daily
        or values["org_requests"] >= config.org_daily
    ):
        raise AIError("AI_RATE_LIMITED", retry_after=retry_after)
    if (
        values["user_charge"] + reserve_cost > config.user_budget
        or values["org_charge"] + reserve_cost > config.org_budget
    ):
        raise AIError("AI_COST_LIMIT", retry_after=retry_after)
    history = []
    if conversation:
        history = list(
            conversation.messages.filter(
                role=AIMessage.Role.USER,
                execution__status=ExecutionStatus.COMPLETED,
            )
            .order_by("-created_at", "-pk")
            .values_list("content", flat=True)[:HISTORY_QUESTIONS]
        )
    else:
        conversation = create_conversation(bound)
    run = AIExecution.objects.create(
        conversation=conversation,
        user_id=live.user_id,
        organization_id=live.organization_id,
        client_request_id=request_id,
        request_signature=request_signature,
        usage_day=day,
        reserved_microusd=reserve_cost,
        charged_microusd=reserve_cost,
    )
    AIMessage.objects.bulk_create(
        [
            AIMessage(
                conversation=conversation,
                execution=run,
                role=AIMessage.Role.USER,
                content=data["message"],
                status=ExecutionStatus.COMPLETED,
                completed_at=now,
            ),
            AIMessage(
                conversation=conversation,
                execution=run,
                role=AIMessage.Role.ASSISTANT,
                status=ExecutionStatus.PENDING,
            ),
        ]
    )
    conversation.last_message_at = now
    conversation.save(update_fields=["last_message_at", "updated_at"])
    return (
        run,
        bound,
        providers,
        [item[: HISTORY_MAX_CHARS // HISTORY_QUESTIONS] for item in reversed(history)],
    )


@transaction.atomic
def finish(run, scope, result, failure, tools, attempts, started):
    # Match the lock order used for history changes and quota reservations.
    if (
        not Organization.objects.select_for_update(no_key=True)
        .filter(pk=run.organization_id)
        .first()
    ):
        raise AIError("AI_PERMISSION_DENIED")
    run = AIExecution.objects.select_for_update(no_key=True).filter(pk=run.pk).first()
    if run is None:
        raise AIError("AI_CONVERSATION_NOT_FOUND")
    try:
        scope.fresh()
    except AIError as exc:
        failure = exc.code
    if run.status != ExecutionStatus.PENDING:
        if failure == "AI_PERMISSION_DENIED":
            raise AIError(failure)
        return run
    answer, sources, code = result if not failure else ("", [], failure)
    now = timezone.now()
    run.status = ExecutionStatus.FAILED if failure else ExecutionStatus.COMPLETED
    run.error_code = code
    run.attempted_models = [
        attempt.model.label for attempt in attempts if attempt.calls
    ]
    run.tools = tools.attempts
    run.http_calls = sum(attempt.calls for attempt in attempts)
    measured = sum(attempt.measured for attempt in attempts)
    run.input_tokens = sum(item.tokens_in for item in attempts) if measured else None
    run.output_tokens = sum(item.tokens_out for item in attempts) if measured else None
    run.token_usage_complete = measured == run.http_calls if run.http_calls else None
    run.charged_microusd = sum(item.charge for item in attempts)
    run.latency_ms = round((monotonic() - started) * 1000)
    run.completed_at = now
    run.save()
    run.messages.filter(role=AIMessage.Role.ASSISTANT).update(
        content=answer,
        sources=json.loads(json.dumps(sources, cls=DjangoJSONEncoder)),
        status=run.status,
        error_code=code,
        completed_at=now,
        updated_at=now,
    )
    AIConversation.objects.filter(pk=run.conversation_id).update(
        last_message_at=now, updated_at=now
    )
    transaction.on_commit(lambda: log_run(run))
    return run


def log_run(run):
    fields = {
        "event": "realinova.execution",
        "id": str(run.pk),
        "organization_id": str(run.organization_id),
        "user_id": run.user_id,
        "status": run.status,
        "latency_ms": run.latency_ms,
        "model_attempts": run.attempted_models,
        "tools": run.tools,
        "http_calls": run.http_calls,
        "input_tokens": run.input_tokens,
        "output_tokens": run.output_tokens,
        "charge_microusd": run.charged_microusd,
        "error_code": run.error_code,
    }
    message = json.dumps(fields)
    if run.error_code and run.error_code != "AI_DATA_UNAVAILABLE":
        logger.warning(message)
    else:
        logger.info(message)


def execute(scope, data):
    started = monotonic()
    intent = direct_intent(data["message"])
    config = limits()
    run, bound, providers, history = reserve(scope, data, intent, config)
    if bound is None:
        return run, True
    tools = QueryTools(bound, config.max_tools)
    result, failure, attempts = None, "", []
    try:
        if intent:
            result = direct_answer(intent, tools)
        else:
            result = perform(
                data["message"], history, tools, providers, config, attempts
            )
    except AIError as exc:
        failure = exc.code
    except DatabaseError:
        failure = "AI_TOOL_ERROR"
    run = finish(run, bound, result, failure, tools, attempts, started)
    return run, False
