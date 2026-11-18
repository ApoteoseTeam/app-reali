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

    class Meta:
        indexes = [models.Index(fields=["status", "created_at"])]


class UserInvitation(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        ACCEPTED = "ACCEPTED", "Aceito"
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
