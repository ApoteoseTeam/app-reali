import hashlib
import secrets
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel
from apps.users.models import Membership


class InstitutionRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        APPROVED = "APPROVED", "Aprovada"
        REJECTED = "REJECTED", "Rejeitada"

    organization_name = models.CharField(max_length=160)
    contact_name = models.CharField(max_length=160)
    contact_email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT
    )
    rejection_reason = models.TextField(blank=True)
    organization = models.OneToOneField(
        "institutions.Organization", null=True, blank=True, on_delete=models.PROTECT
    )
    initial_invitation = models.OneToOneField(
        "api.UserInvitation", null=True, blank=True, on_delete=models.PROTECT
    )

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"])]
        permissions = [("review_institutions", "Can review and provision institutions")]


class UserInvitation(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        ACCEPTED = "ACCEPTED", "Aceito"
        EXPIRED = "EXPIRED", "Expirado"
        REVOKED = "REVOKED", "Cancelado"

    organization = models.ForeignKey(
        "institutions.Organization",
        on_delete=models.PROTECT,
        related_name="invitations",
    )
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=Membership.Role.choices)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    all_schools_access = models.BooleanField(default=False)
    schools = models.ManyToManyField(
        "institutions.School", related_name="invitations", blank=True
    )
    delivery_status = models.CharField(
        max_length=10,
        choices=[
            ("PENDING", "Pendente"),
            ("SENT", "Enviado ao transporte"),
            ("FAILED", "Falhou"),
        ],
        default="PENDING",
    )
    last_sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sent_invitations",
    )

    @staticmethod
    def generate_token():
        raw = secrets.token_urlsafe(40)
        return raw, hashlib.sha256(raw.encode()).hexdigest()

    @property
    def valid(self):
        return self.status == self.Status.PENDING and self.expires_at > timezone.now()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "email"],
                condition=models.Q(status="PENDING"),
                name="uq_pending_invitation_org_email",
            ),
        ]


class AuditLog(BaseModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    organization = models.ForeignKey(
        "institutions.Organization", null=True, blank=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=50)
    object_id = models.CharField(max_length=64)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [models.Index(fields=["organization", "created_at"])]
        permissions = [
            (
                "manage_account_sessions",
                "Can revoke account sessions and deactivate accounts",
            )
        ]


class PasswordResetMail(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_version = models.PositiveIntegerField()
    attempts = models.PositiveSmallIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now, db_index=True)


class CameraCredential(BaseModel):
    camera = models.OneToOneField(
        "cameras.Camera", on_delete=models.CASCADE, related_name="credential"
    )
    secret_hash = models.CharField(max_length=64)
    revoked_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def generate_secret():
        raw = secrets.token_urlsafe(48)
        return raw, hashlib.sha256(raw.encode()).hexdigest()
