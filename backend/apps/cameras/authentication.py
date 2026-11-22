import hashlib
import hmac
import re
from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, Throttled
from rest_framework.permissions import BasePermission
from rest_framework.throttling import SimpleRateThrottle

from apps.api.models import CameraCredential

from .models import Camera, DeviceCredential, EdgeDevice
from .observability import log_device_event

TOKEN_FORMAT = re.compile(rb"[0-9a-f]{24}\.[A-Za-z0-9_-]{43}")
INVALID = "Credencial de dispositivo inválida."


@dataclass(frozen=True)
class DevicePrincipal:
    id: UUID
    is_authenticated = True


def digest(token):
    return hashlib.sha256(token).hexdigest()


class FailureLimit(SimpleRateThrottle):
    def __init__(self, request):
        self.key = f"reali-device-failures:{digest((self.get_ident(request) or 'unknown').encode())}"

    def check(self):
        if cache.get(self.key, 0) >= settings.DEVICE_AUTH_FAILURE_LIMIT:
            raise Throttled(wait=60)

    def record(self, reason, *, device=None):
        if cache.add(self.key, 1, timeout=60):
            count = 1
        else:
            try:
                count = cache.incr(self.key)
            except ValueError:
                count = 1
                cache.add(self.key, count, timeout=60)
        if count in {1, settings.DEVICE_AUTH_FAILURE_LIMIT}:
            log_device_event("DEVICE_AUTH_FAILED", device=device, reason=reason)


def credential_failure(credential, device, now):
    if not credential.is_active or credential.revoked_at:
        return "credential_revoked"
    if credential.expires_at and credential.expires_at <= now:
        return "credential_expired"
    if not (
        device.is_active
        and device.school.is_active
        and device.school.organization.is_active
    ):
        return "device_unavailable"
    return None


class DeviceAuthentication(BaseAuthentication):
    def authenticate(self, request):
        authorization = get_authorization_header(request)
        if not authorization:
            return None
        attempts = FailureLimit(request)
        attempts.check()
        parts = authorization.split()
        if (
            len(parts) != 2
            or parts[0].lower() != b"device"
            or not TOKEN_FORMAT.fullmatch(parts[1])
        ):
            attempts.record("invalid_header")
            raise AuthenticationFailed(INVALID)
        raw = parts[1]
        prefix = raw.split(b".", 1)[0].decode("ascii")
        credential = (
            DeviceCredential.objects.select_related("edge_device__school__organization")
            .filter(token_prefix=prefix)
            .first()
        )
        expected = credential.token_hash if credential else "0" * 64
        if not hmac.compare_digest(digest(raw), expected) or credential is None:
            attempts.record("invalid_token")
            raise AuthenticationFailed(INVALID)
        device = credential.edge_device
        failure = credential_failure(credential, device, timezone.now())
        if failure:
            attempts.record(failure, device=device)
            raise AuthenticationFailed(INVALID)
        return DevicePrincipal(device.pk), credential

    def authenticate_header(self, request):
        return "Device"


class LegacyCameraAuthentication(BaseAuthentication):
    def authenticate(self, request):
        camera_id = request.headers.get("X-Camera-ID")
        raw = request.headers.get("X-Camera-Key", "")
        if not camera_id and not raw:
            return None
        attempts = FailureLimit(request)
        attempts.check()
        if (
            not settings.CAMERA_LEGACY_AUTH_ENABLED
            or get_authorization_header(request)
            or not raw
            or len(raw) > 256
        ):
            attempts.record("legacy_invalid_header")
            raise PermissionDenied(INVALID)
        try:
            camera_id = UUID(camera_id or "")
        except ValueError as exc:
            attempts.record("legacy_invalid_camera_id")
            raise PermissionDenied(INVALID) from exc
        credential = (
            CameraCredential.objects.select_related("camera")
            .filter(
                camera_id=camera_id,
                revoked_at__isnull=True,
                camera__edge_device__isnull=True,
                camera__is_active=True,
                camera__school__is_active=True,
                camera__school__organization__is_active=True,
            )
            .first()
        )
        expected = credential.secret_hash if credential else "0" * 64
        if (
            not hmac.compare_digest(digest(raw.encode()), expected)
            or credential is None
        ):
            attempts.record("legacy_invalid_token")
            raise PermissionDenied(INVALID)
        return DevicePrincipal(camera_id), credential


class IsDevice(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, DevicePrincipal)


class DeviceTrafficThrottle(SimpleRateThrottle):
    scope = "device-traffic"

    def get_cache_key(self, request, view):
        if isinstance(request.user, DevicePrincipal):
            return self.cache_format % {"scope": self.scope, "ident": request.user.id}
        return None


def lock_authenticated_device(credential):
    device = (
        EdgeDevice.objects.select_for_update(of=("self",), no_key=True)
        .select_related("school__organization")
        .get(pk=credential.edge_device_id)
    )
    current = DeviceCredential.objects.get(pk=credential.pk)
    now = timezone.now()
    failure = credential_failure(current, device, now)
    if failure:
        log_device_event("DEVICE_AUTH_FAILED", device=device, reason=failure)
        raise AuthenticationFailed(INVALID)
    current.last_used_at = now
    current.save(update_fields=["last_used_at", "updated_at"])
    return device, now


def lock_legacy_camera(credential):
    camera = (
        Camera.objects.select_for_update(of=("self",))
        .select_related("school__organization")
        .get(pk=credential.camera_id)
    )
    if (
        camera.edge_device_id
        or not camera.is_active
        or not camera.school.is_active
        or not camera.school.organization.is_active
        or not CameraCredential.objects.filter(
            pk=credential.pk,
            revoked_at__isnull=True,
            secret_hash=credential.secret_hash,
        ).exists()
    ):
        raise PermissionDenied(INVALID)
    return camera


class DeviceAuthenticationSchema(OpenApiAuthenticationExtension):
    target_class = DeviceAuthentication
    name = "deviceAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": "Device <token>",
        }


class LegacyCameraAuthenticationSchema(OpenApiAuthenticationExtension):
    target_class = LegacyCameraAuthentication
    name = ["legacyCameraId", "legacyCameraKey"]

    def get_security_definition(self, auto_schema):
        return [
            {"type": "apiKey", "in": "header", "name": "X-Camera-ID"},
            {"type": "apiKey", "in": "header", "name": "X-Camera-Key"},
        ]
