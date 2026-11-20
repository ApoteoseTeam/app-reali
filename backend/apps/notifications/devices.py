import hashlib
import secrets
import uuid

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework_simplejwt.settings import api_settings

from apps.api.session_revocations import SESSION_ID_CLAIM, is_revoked

from .models import PushDevice


class DeviceConflict(APIException):
    status_code = 409
    default_detail = (
        "Este dispositivo já possui outra inscrição ou precisa de uma nova sessão."
    )
    default_code = "push_device_conflict"


class PushNotConfigured(APIException):
    status_code = 503
    default_detail = "O serviço push está indisponível."
    default_code = "push_unavailable"


def cipher():
    try:
        return MultiFernet([Fernet(key) for key in settings.NOTIFICATION_PUSH_KEYS])
    except (TypeError, ValueError) as exc:
        raise PushNotConfigured() from exc


def digest(value):
    return hashlib.sha256(value.encode("ascii")).hexdigest()


@transaction.atomic
def register_device(
    user, token, *, installation, installation_secret, push_token, platform
):
    session_id = token.get(SESSION_ID_CLAIM) if token else None
    if not session_id:
        raise DeviceConflict()
    current = get_user_model().objects.select_for_update().get(pk=user.pk)
    if (
        not current.is_active
        or current.session_version != user.session_version
        or is_revoked(session_id)
    ):
        raise PermissionDenied("Sessão encerrada.")
    protected = cipher()
    installation_digest = digest(installation_secret)
    token_digest = digest(push_token)
    matches = list(
        PushDevice.objects.select_for_update()
        .filter(Q(installation=installation) | Q(token_digest=token_digest))
        .order_by("pk")
    )
    device = next(
        (entry for entry in matches if entry.installation == installation), None
    )
    conflict = any(
        entry.token_digest == token_digest and entry != device for entry in matches
    )
    if conflict or (
        device
        and not secrets.compare_digest(device.installation_digest, installation_digest)
    ):
        raise DeviceConflict()
    now = timezone.now()
    if device is None:
        device = PushDevice(
            installation=installation, installation_digest=installation_digest
        )
    same = (
        device.is_active
        and device.user_id == current.pk
        and str(device.session_id) == str(session_id)
        and device.token_digest == token_digest
    )
    if not same:
        device.binding = uuid.uuid4()
        device.last_success_at = None
        device.last_failure_at = None
    device.user = current
    device.session_id = session_id
    device.session_version = current.session_version
    device.session_expires_at = now + api_settings.REFRESH_TOKEN_LIFETIME
    device.platform = platform
    device.token_digest = token_digest
    device.encrypted_token = protected.encrypt(push_token.encode("ascii"))
    device.last_registered_at = now
    device.is_active = True
    try:
        device.save()
    except IntegrityError as exc:
        raise DeviceConflict() from exc
    return device


def revoke_session_devices(user, session_id):
    PushDevice.objects.filter(user=user, session_id=session_id, is_active=True).update(
        is_active=False,
        updated_at=timezone.now(),
    )
