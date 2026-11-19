from .models import AuditLog


def audit(action, obj, *, actor=None, organization=None, details=None):
    AuditLog.objects.create(
        actor=actor,
        organization=organization,
        action=action,
        object_id=str(obj.pk),
        details=details or {},
    )
