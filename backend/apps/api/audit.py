from contextvars import ContextVar
from uuid import uuid4

from .models import AuditLog

request_reference = ContextVar("audit_request_reference", default=None)


class AuditRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        reference = uuid4()
        context = request_reference.set(reference)
        try:
            response = self.get_response(request)
            response.headers["X-Request-ID"] = str(reference)
            return response
        finally:
            request_reference.reset(context)


def sanitized(value):
    if isinstance(value, dict):
        return {
            key: sanitized(item)
            for key, item in value.items()
            if not any(
                word in key.lower()
                for word in ("token", "password", "secret", "authorization")
            )
        }
    if isinstance(value, (list, tuple)):
        return [sanitized(item) for item in value]
    return value


def audit(action, obj, *, actor=None, organization=None, school_id=None, details=None):
    details = sanitized(details or {})
    if organization is not None:
        school_id = school_id or details.get("school_id")
    return AuditLog.objects.create(
        actor=actor,
        organization=organization,
        school_id=school_id,
        action=action,
        object_id=str(obj.pk),
        target_type=obj._meta.label_lower,
        request_id=request_reference.get(),
        details=details,
    )
