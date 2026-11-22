from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class AIConversation(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativa"
        ARCHIVED = "ARCHIVED", "Arquivada"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    organization = models.ForeignKey(
        "institutions.Organization", on_delete=models.CASCADE
    )
    school = models.ForeignKey(
        "institutions.School", null=True, on_delete=models.PROTECT
    )
    access_role = models.CharField(max_length=20)
    scope_key = models.CharField(max_length=64)
    title = models.CharField(max_length=120, default="Nova conversa")
    status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.ACTIVE
    )
    last_message_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["user", "organization", "-updated_at"],
                name="ai_conversation_owner_idx",
            ),
            models.Index(fields=["created_at"], name="ai_conversation_retention_idx"),
        ]


class ExecutionStatus(models.TextChoices):
    PENDING = "PENDING", "Em andamento"
    COMPLETED = "COMPLETED", "Concluída"
    FAILED = "FAILED", "Falhou"


class AIExecution(BaseModel):
    conversation = models.ForeignKey(
        AIConversation, null=True, on_delete=models.SET_NULL
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    organization = models.ForeignKey(
        "institutions.Organization", on_delete=models.CASCADE
    )
    client_request_id = models.UUIDField(null=True)
    request_signature = models.CharField(max_length=64, blank=True)
    usage_day = models.DateField()
    status = models.CharField(
        max_length=9, choices=ExecutionStatus.choices, default=ExecutionStatus.PENDING
    )
    attempted_models = models.JSONField(default=list)
    tools = models.JSONField(default=list)
    http_calls = models.PositiveIntegerField(default=0)
    input_tokens = models.PositiveIntegerField(null=True)
    output_tokens = models.PositiveIntegerField(null=True)
    token_usage_complete = models.BooleanField(null=True)
    reserved_microusd = models.PositiveBigIntegerField(default=0)
    charged_microusd = models.PositiveBigIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(null=True)
    error_code = models.CharField(max_length=40, blank=True)
    completed_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["organization", "usage_day", "user"],
                name="ai_execution_quota_idx",
            ),
            models.Index(fields=["created_at"], name="ai_execution_retention_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization", "client_request_id"],
                condition=models.Q(client_request_id__isnull=False),
                name="ai_execution_idempotency",
            ),
            models.UniqueConstraint(
                fields=["conversation"],
                condition=models.Q(
                    status=ExecutionStatus.PENDING, conversation__isnull=False
                ),
                name="ai_conversation_pending",
            ),
        ]


class AIMessage(BaseModel):
    class Role(models.TextChoices):
        USER = "USER", "Pessoa usuária"
        ASSISTANT = "ASSISTANT", "RealInova"

    conversation = models.ForeignKey(
        AIConversation, on_delete=models.CASCADE, related_name="messages"
    )
    execution = models.ForeignKey(
        AIExecution, null=True, on_delete=models.SET_NULL, related_name="messages"
    )
    role = models.CharField(max_length=9, choices=Role.choices)
    content = models.TextField(blank=True)
    status = models.CharField(max_length=9, choices=ExecutionStatus.choices)
    sources = models.JSONField(default=list)
    error_code = models.CharField(max_length=40, blank=True)
    completed_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["conversation", "created_at", "id"],
                name="ai_message_history_idx",
            )
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["execution", "role"], name="ai_message_execution_role"
            ),
        ]


CONVERSATION_STATUS_CHOICES = AIConversation.Status.choices
MESSAGE_ROLE_CHOICES = AIMessage.Role.choices
EXECUTION_STATUS_CHOICES = ExecutionStatus.choices
