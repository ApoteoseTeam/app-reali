import json
import logging
from io import BytesIO

from django.db import DatabaseError, transaction
from drf_spectacular.utils import (
    PolymorphicProxySerializer,
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, mixins, status, viewsets
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    ParseError,
    PermissionDenied,
    Throttled,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.permissions import organization_id_for
from apps.api.session_revocations import SESSION_ID_CLAIM

from . import serializers as s
from .authorization import user_scope
from .errors import AIError, ERRORS
from .models import AIConversation, AIMessage, ExecutionStatus
from .services import (
    change_conversation,
    create_conversation,
    execute,
    lock_organization,
    owned_conversation,
    usage_summary,
)

logger = logging.getLogger(__name__)
ERROR_SCHEMA = {
    400: s.AIErrorEnvelope,
    401: s.AIErrorEnvelope,
    403: s.AIErrorEnvelope,
    404: s.AIErrorEnvelope,
    409: s.AIErrorEnvelope,
    429: s.AIErrorEnvelope,
    503: s.AIErrorEnvelope,
}
MAX_BODY_BYTES = 12 * 1024


class BoundedJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        body = stream.read(MAX_BODY_BYTES + 1)
        if len(body) > MAX_BODY_BYTES:
            raise AIError("AI_INVALID_MESSAGE")
        try:
            return super().parse(BytesIO(body), media_type, parser_context)
        except RecursionError:
            raise AIError("AI_INVALID_MESSAGE") from None


class AIRequest:
    parser_classes = [BoundedJSONParser]
    throttle_classes = [ScopedRateThrottle]

    def scope(self):
        organization_id = organization_id_for(self.request)
        return user_scope(
            self.request.user.pk,
            organization_id,
            self.request.user.session_version,
            session_id=self.request.auth.get(SESSION_ID_CLAIM)
            if self.request.auth
            else None,
        )

    def handle_exception(self, exc):
        if isinstance(exc, AIError):
            code, message = exc.code, exc.description
        elif isinstance(exc, DatabaseError):
            exc = AIError("AI_PERSISTENCE_ERROR")
            code, message = exc.code, exc.description
        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            code, message = "AI_AUTHENTICATION_REQUIRED", "Autenticação necessária."
        elif isinstance(exc, (ValidationError, ParseError, UnsupportedMediaType)):
            code, message = "AI_INVALID_MESSAGE", ERRORS["AI_INVALID_MESSAGE"][1]
        elif isinstance(exc, PermissionDenied):
            code, message = "AI_PERMISSION_DENIED", ERRORS["AI_PERMISSION_DENIED"][1]
        elif isinstance(exc, Throttled):
            code, message = "AI_RATE_LIMITED", ERRORS["AI_RATE_LIMITED"][1]
        else:
            return super().handle_exception(exc)
        response = super().handle_exception(exc)
        response.data = {"error": {"code": code, "message": message}}
        if code in {
            "AI_PERMISSION_DENIED",
            "AI_CONVERSATION_NOT_FOUND",
            "AI_PERSISTENCE_ERROR",
            "AI_RATE_LIMITED",
            "AI_COST_LIMIT",
        }:
            logger.warning(
                json.dumps(
                    {
                        "event": "realinova.request_rejected",
                        "code": code,
                        "user_id": self.request.user.pk,
                    }
                )
            )
        return response

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "private, no-store"
        return response


class ChatView(AIRequest, APIView):
    throttle_scope = "realinova-chat"

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.ChatInput,
        responses={
            **ERROR_SCHEMA,
            200: s.ChatOutput,
            202: s.ChatOutput,
            502: s.ChatOutput,
            503: PolymorphicProxySerializer(
                component_name="RealInovaServiceUnavailable",
                serializers=[s.ChatOutput, s.AIErrorEnvelope],
                resource_type_field_name=None,
            ),
            504: s.ChatOutput,
        },
    )
    def post(self, request):
        scope = self.scope()
        payload = s.ChatInput(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        if data.get("organization_id", scope.organization_id) != scope.organization_id:
            raise AIError("AI_PERMISSION_DENIED")
        run, replayed = execute(scope, data)
        if (
            run.error_code == "AI_PERMISSION_DENIED"
            and run.status == ExecutionStatus.FAILED
        ):
            raise AIError(run.error_code)
        # Check current access even on a replay or after a slow provider call.
        owned_conversation(self.scope(), run.conversation_id)
        assistant = run.messages.filter(role=AIMessage.Role.ASSISTANT).first()
        if not assistant:
            raise AIError("AI_CONVERSATION_NOT_FOUND")
        code = run.error_code
        error = {"code": code, "message": ERRORS[code][1]} if code else None
        http_status = status.HTTP_200_OK
        if run.status == ExecutionStatus.PENDING:
            http_status = status.HTTP_202_ACCEPTED
        elif run.status == ExecutionStatus.FAILED:
            http_status = ERRORS[code][0]
        result = s.ChatOutput(
            {
                "conversation_id": run.conversation_id,
                "message_id": assistant.pk,
                "status": run.status,
                "answer": assistant.content or None,
                "sources": assistant.sources,
                "usage": run,
                "error": error,
                "replayed": replayed,
            }
        )
        return Response(result.data, status=http_status)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(
        parameters=[ORGANIZATION_HEADER],
        responses={**ERROR_SCHEMA, 200: s.ConversationOutput},
    ),
    create=extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.ConversationCreate,
        responses={**ERROR_SCHEMA, 201: s.ConversationOutput},
    ),
    partial_update=extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.ConversationUpdate,
        responses={**ERROR_SCHEMA, 200: s.ConversationOutput},
    ),
    destroy=extend_schema(
        parameters=[ORGANIZATION_HEADER], responses={**ERROR_SCHEMA, 204: None}
    ),
)
class ConversationViewSet(AIRequest, mixins.ListModelMixin, viewsets.GenericViewSet):
    throttle_scope = "realinova-conversation"
    lookup_value_converter = "uuid"
    queryset = AIConversation.objects.none()
    serializer_class = s.ConversationOutput

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return self.scope().conversations()

    @transaction.atomic
    def create(self, request):
        payload = s.ConversationCreate(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        scope = lock_organization(self.scope()).bind(data.get("school_id"))
        kwargs = {"title": data["title"]} if "title" in data else {}
        row = create_conversation(scope, **kwargs)
        return Response(self.get_serializer(row).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk):
        row = owned_conversation(self.scope(), pk)
        return Response(self.get_serializer(row).data)

    def partial_update(self, request, pk):
        payload = s.ConversationUpdate(data=request.data)
        payload.is_valid(raise_exception=True)
        row = change_conversation(self.scope(), pk, payload.validated_data)
        return Response(self.get_serializer(row).data)

    def destroy(self, request, pk):
        change_conversation(self.scope(), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessagesView(AIRequest, generics.ListAPIView):
    serializer_class = s.MessageOutput
    throttle_scope = "realinova-conversation"
    queryset = AIMessage.objects.none()

    @extend_schema(parameters=[ORGANIZATION_HEADER])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        row = owned_conversation(self.scope(), self.kwargs["pk"])
        return row.messages.order_by("created_at", "-role", "pk")


class UsageView(AIRequest, APIView):
    throttle_scope = "realinova-conversation"

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], responses={**ERROR_SCHEMA, 200: s.UsageOutput}
    )
    def get(self, request):
        return Response(s.UsageOutput(usage_summary(self.scope())).data)
