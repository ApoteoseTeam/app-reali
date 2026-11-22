import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import BaseModel


class OperationalStatus(models.TextChoices):
    UNKNOWN = "UNKNOWN", "Desconhecido"
    ONLINE = "ONLINE", "Online"
    OFFLINE = "OFFLINE", "Offline"
    ERROR = "ERROR", "Falha"
    DEGRADED = "DEGRADED", "Degradado"


class VideoStatus(models.TextChoices):
    STREAMING = "STREAMING", "Transmitindo"
    STARTING = "STARTING", "Iniciando"
    DISCONNECTED = "DISCONNECTED", "Desconectado"
    ERROR = "ERROR", "Falha"


OPERATIONAL_STATUS_CHOICES = OperationalStatus.choices


class DetectorStatus(models.TextChoices):
    RUNNING = "RUNNING", "Executando"
    STARTING = "STARTING", "Iniciando"
    STOPPED = "STOPPED", "Parado"
    ERROR = "ERROR", "Falha"


class EdgeDevice(BaseModel):
    school = models.ForeignKey(
        "institutions.School", on_delete=models.PROTECT, related_name="edge_devices"
    )
    name = models.CharField(max_length=150)
    device_identifier = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False
    )
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_observed_at = models.DateTimeField(null=True, blank=True)
    agent_version = models.CharField(max_length=50, blank=True)

    class Meta:
        permissions = [
            ("support_camera_devices", "Can provision and support camera devices")
        ]

    def __str__(self):
        return self.name


class Camera(BaseModel):
    class CameraType(models.TextChoices):
        ENTRANCE = "ENTRANCE", "Portaria"
        CAFETERIA = "CAFETERIA", "Cantina"

    school = models.ForeignKey(
        "institutions.School", on_delete=models.PROTECT, related_name="cameras"
    )
    edge_device = models.ForeignKey(
        EdgeDevice,
        on_delete=models.PROTECT,
        related_name="cameras",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=150)
    camera_type = models.CharField(max_length=12, choices=CameraType.choices)
    location = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    video_status = models.CharField(
        max_length=12, choices=VideoStatus.choices, blank=True
    )
    detector_status = models.CharField(
        max_length=10, choices=DetectorStatus.choices, blank=True
    )
    processing_fps = models.FloatField(null=True, blank=True)
    pending_events = models.PositiveIntegerField(null=True, blank=True)
    telemetry_reason = models.CharField(max_length=30, blank=True)
    health_status = models.CharField(
        max_length=10,
        choices=OperationalStatus.choices,
        default=OperationalStatus.UNKNOWN,
    )

    class Meta:
        indexes = [models.Index(fields=["last_seen_at"], name="camera_last_seen_idx")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(processing_fps__gte=0, processing_fps__lte=1000)
                | models.Q(processing_fps__isnull=True),
                name="camera_valid_fps",
            )
        ]

    def clean(self):
        super().clean()
        if self.edge_device_id and self.school_id != self.edge_device.school_id:
            raise ValidationError(
                {"edge_device": "O agente e a câmera devem pertencer à mesma escola."}
            )

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.school.name})"


class DeviceCredential(BaseModel):
    edge_device = models.ForeignKey(
        EdgeDevice, on_delete=models.PROTECT, related_name="credentials"
    )
    token_prefix = models.CharField(max_length=24, unique=True, editable=False)
    token_hash = models.CharField(max_length=64, editable=False)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["edge_device"],
                condition=models.Q(is_active=True),
                name="one_active_device_credential",
            ),
            models.CheckConstraint(
                condition=models.Q(is_active=True, revoked_at__isnull=True)
                | models.Q(is_active=False, revoked_at__isnull=False),
                name="device_credential_revocation_state",
            ),
        ]


class CameraConfiguration(BaseModel):
    camera = models.OneToOneField(
        Camera, on_delete=models.PROTECT, related_name="configuration"
    )
    version = models.PositiveIntegerField(default=1)
    parameters = models.JSONField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(version__gte=1),
                name="camera_configuration_version_positive",
            )
        ]


class CameraHealthEvent(BaseModel):
    camera = models.ForeignKey(
        Camera, on_delete=models.PROTECT, related_name="health_events"
    )
    event_type = models.CharField(max_length=30)
    previous_status = models.CharField(max_length=10, choices=OperationalStatus.choices)
    new_status = models.CharField(max_length=10, choices=OperationalStatus.choices)
    message = models.CharField(max_length=200)
    occurred_at = models.DateTimeField(db_index=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["camera", "-occurred_at"], name="camera_health_history_idx"
            )
        ]
