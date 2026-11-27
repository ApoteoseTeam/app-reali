from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.fields import UUIDField

from apps.institutions.models import School
from apps.users.models import Membership

Role = Membership.Role
MANAGEMENT_ROLES = {Role.MANAGER}
KITCHEN_ROLES = MANAGEMENT_ROLES | {Role.COOK}
FULL_REPORT_ROLES = MANAGEMENT_ROLES | {Role.NUTRITIONIST, Role.SECRETARIAT}
ROLE_PERMISSIONS = {
    "config": MANAGEMENT_ROLES,
    "staff": MANAGEMENT_ROLES,
    "audit_logs": MANAGEMENT_ROLES,
    "manage_meals": MANAGEMENT_ROLES,
    "forecast_policy": MANAGEMENT_ROLES,
    "rebuild_metrics": MANAGEMENT_ROLES,
    "analytics_reports": FULL_REPORT_ROLES,
    "prepare": KITCHEN_ROLES,
    "forecast": FULL_REPORT_ROLES | {Role.COOK},
    "meal_history": FULL_REPORT_ROLES | {Role.COOK},
    "raw_counts": FULL_REPORT_ROLES,
    "adjust_counts": MANAGEMENT_ROLES,
    "indicators": FULL_REPORT_ROLES | {Role.COOK},
    "camera_status": FULL_REPORT_ROLES | {Role.COOK},
    "camera_history": FULL_REPORT_ROLES,
    "camera_admin": MANAGEMENT_ROLES,
    "realinova_full": FULL_REPORT_ROLES,
    "realinova_limited": {Role.COOK},
}


def require_role(membership, action):
    if membership.role not in ROLE_PERMISSIONS[action]:
        raise PermissionDenied("Seu papel não permite esta operação.")
    return membership


def organization_id_for(request):
    org_id = request.headers.get("X-Organization-ID")
    if not org_id:
        raise ValidationError({"organization": "Informe X-Organization-ID."})
    try:
        return UUIDField().run_validation(org_id)
    except ValidationError as exc:
        raise ValidationError({"organization": exc.detail}) from exc


def membership_for(request):
    org_id = organization_id_for(request)
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


def schools_for(membership, *, active_only=False):
    schools = School.objects.filter(organization_id=membership.organization_id)
    if not membership.all_schools_access:
        schools = schools.filter(membership_accesses__membership=membership)
    if active_only:
        schools = schools.filter(is_active=True)
    return schools.order_by("id")


def check_school(membership, school, *, active_only=False):
    if (
        not schools_for(membership, active_only=active_only)
        .filter(pk=school.pk)
        .exists()
    ):
        raise PermissionDenied("Escola indisponível no seu escopo.")


def require_management(request):
    return require_role(membership_for(request), "manage_meals")


def require_admin(request):
    return require_role(membership_for(request), "config")


def internal_operator(user, permission):
    if not (
        user.is_authenticated
        and user.is_active
        and user.is_staff
        and user.has_perm(permission)
    ):
        raise PermissionDenied("Operação reservada à equipe Reali.")
