from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.fields import UUIDField
from apps.users.models import Membership

MANAGEMENT_ROLES = {Membership.Role.ADMIN, Membership.Role.MANAGER}


def membership_for(request):
    org_id = request.headers.get("X-Organization-ID")
    if not org_id:
        raise ValidationError({"organization": "Informe X-Organization-ID."})
    try:
        org_id = UUIDField().run_validation(org_id)
    except ValidationError as exc:
        raise ValidationError({"organization": exc.detail}) from exc
    membership = (
        Membership.objects.select_related("organization")
        .filter(
            user=request.user,
            organization_id=org_id,
            is_active=True,
            organization__is_active=True,
        )
        .first()
    )
    if not membership:
        raise PermissionDenied("Sem acesso a esta organização.")
    return membership


def require_management(request):
    m = membership_for(request)
    if m.role not in MANAGEMENT_ROLES:
        raise PermissionDenied("Somente administradores e gestores.")
    return m


def require_admin(request):
    m = membership_for(request)
    if m.role != Membership.Role.ADMIN:
        raise PermissionDenied("Somente administradores.")
    return m
