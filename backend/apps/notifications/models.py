from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel


class Kind(models.TextChoices):
    CAMERA_OFFLINE = "CAMERA_OFFLINE", "Câmera offline"
    CAMERA_ERROR = "CAMERA_ERROR", "Falha na câmera"
    CAMERA_RECOVERED = "CAMERA_RECOVERED", "Câmera recuperada"
    DEVICE_SYNC_DELAY = "DEVICE_SYNC_DELAY", "Sincronização atrasada"
    DEVICE_OFFLINE = "DEVICE_OFFLINE", "Agente offline"
    MEAL_SERVICE_REMINDER = "MEAL_SERVICE_REMINDER", "Lembrete de merenda"
    MEAL_SERVICE_STARTED = "MEAL_SERVICE_STARTED", "Merenda iniciada"
    MEAL_SERVING_STARTED = "MEAL_SERVING_STARTED", "Distribuição iniciada"
    MEAL_SERVICE_FINISHED = "MEAL_SERVICE_FINISHED", "Merenda finalizada"
    MEAL_SERVICE_CANCELLED = "MEAL_SERVICE_CANCELLED", "Merenda cancelada"
    FORECAST_UNAVAILABLE = "FORECAST_UNAVAILABLE", "Previsão indisponível"
    FORECAST_DIFFERENCE = "FORECAST_DIFFERENCE", "Diferença de previsão"
    INVITATION_CREATED = "INVITATION_CREATED", "Convite criado"
    INVITATION_EXPIRING = "INVITATION_EXPIRING", "Convite próximo do vencimento"
    INVITATION_CLOSED = "INVITATION_CLOSED", "Convite encerrado"
    MEMBERSHIP_UPDATED = "MEMBERSHIP_UPDATED", "Vínculo atualizado"
    COUNT_ADJUSTMENT_CREATED = "COUNT_ADJUSTMENT_CREATED", "Correção de contagem"
    DATA_RECONCILED = "DATA_RECONCILED", "Indicadores reconciliados"
    DATA_STALE = "DATA_STALE", "Indicadores desatualizados"
    REPORT_READY = "REPORT_READY", "Relatório disponível"
    SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT", "Comunicado do Reali"


class Priority(models.TextChoices):
    LOW = "LOW", "Baixa"
    NORMAL = "NORMAL", "Normal"
    HIGH = "HIGH", "Alta"
    CRITICAL = "CRITICAL", "Crítica"


class Notification(BaseModel):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    organization = models.ForeignKey(
        "institutions.Organization", on_delete=models.CASCADE
    )
    school = models.ForeignKey(
        "institutions.School", null=True, blank=True, on_delete=models.PROTECT
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=500)
    priority = models.CharField(max_length=8, choices=Priority.choices)
    data = models.JSONField(default=dict, blank=True)
    event_key = models.CharField(max_length=180)
    in_app = models.BooleanField(default=True)
    read_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "organization", "event_key"],
                name="unique_notification_event",
            ),
        ]
        indexes = [
            models.Index(
                fields=["recipient", "organization", "-created_at", "-id"],
                name="notification_inbox_idx",
            ),
        ]


class NotificationPreference(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    organization = models.ForeignKey(
        "institutions.Organization", on_delete=models.CASCADE
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    in_app = models.BooleanField(default=True)
    push = models.BooleanField(default=False)
    email = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization", "kind"],
                name="unique_notification_preference",
            ),
        ]


class PushDevice(BaseModel):
    class Platform(models.TextChoices):
        ANDROID = "ANDROID", "Android"
        IOS = "IOS", "iOS"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    installation = models.UUIDField(unique=True)
    installation_digest = models.CharField(max_length=64, editable=False)
    token_digest = models.CharField(max_length=64, unique=True, editable=False)
    encrypted_token = models.BinaryField(editable=False)
    platform = models.CharField(max_length=7, choices=Platform.choices)
    session_id = models.UUIDField(db_index=True)
    session_version = models.PositiveIntegerField()
    session_expires_at = models.DateTimeField()
    binding = models.UUIDField(editable=False)
    is_active = models.BooleanField(default=True, db_index=True)
    last_registered_at = models.DateTimeField(default=timezone.now)
    last_success_at = models.DateTimeField(null=True)
    last_failure_at = models.DateTimeField(null=True)


class RevokedPushSession(models.Model):
    session_id = models.UUIDField(primary_key=True)
    expires_at = models.DateTimeField(db_index=True)


class NotificationDelivery(BaseModel):
    class Channel(models.TextChoices):
        IN_APP = "IN_APP"
        PUSH = "PUSH"
        EMAIL = "EMAIL"

    class Status(models.TextChoices):
        PENDING = "PENDING"
        SENT = "SENT"
        ACCEPTED = "ACCEPTED"
        CONFIRMED = "CONFIRMED"
        REJECTED = "REJECTED"
        FAILED = "FAILED"
        CANCELLED = "CANCELLED"

    notification = models.ForeignKey(Notification, on_delete=models.CASCADE)
    channel = models.CharField(max_length=6, choices=Channel.choices)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    device = models.ForeignKey(PushDevice, null=True, on_delete=models.SET_NULL)
    binding = models.UUIDField(null=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    receipt_attempt_count = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    provider_reference = models.CharField(max_length=100, blank=True)
    accepted_at = models.DateTimeField(null=True)
    last_error_code = models.CharField(max_length=40, blank=True)
    lease_id = models.UUIDField(null=True)
    lease_until = models.DateTimeField(null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["status", "next_attempt_at"], name="notification_delivery_due"
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "channel"],
                condition=~models.Q(channel="PUSH"),
                name="unique_notification_channel",
            ),
            models.UniqueConstraint(
                fields=["notification", "device"],
                condition=models.Q(channel="PUSH", device__isnull=False),
                name="unique_notification_push",
            ),
        ]


class AlertIncident(BaseModel):
    source = models.CharField(max_length=10)
    source_id = models.UUIDField()
    condition = models.CharField(max_length=12)
    opened_at = models.DateTimeField(null=True)
    noticed = models.BooleanField(default=False)
    escalated = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_id", "condition"],
                name="unique_alert_incident",
            ),
        ]


class AlertScan(models.Model):
    name = models.CharField(primary_key=True, max_length=20)
    last_source_id = models.UUIDField(null=True)
