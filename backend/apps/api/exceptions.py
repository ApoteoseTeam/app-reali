import logging

from django.db import DatabaseError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import exception_handler

from .audit import audit
from .permissions import membership_for

log = logging.getLogger(__name__)
ADMIN_ROUTES = (
    "/api/v1/count-adjustments/",
    "/api/v1/audit-logs/",
    "/api/v1/admin/",
    "/api/v1/memberships/",
    "/api/v1/invitations/",
    "/api/v1/schools/",
    "/api/v1/cameras/",
    "/api/v1/edge-devices/",
    "/api/v1/analytics/",
)


def audit_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    if (
        response is None
        or response.status_code not in {403, 404}
        or request is None
        or not request.user.is_authenticated
        or not request.path_info.startswith(ADMIN_ROUTES)
        or (
            response.status_code == 404 and request.method in {"GET", "HEAD", "OPTIONS"}
        )
    ):
        return response
    try:
        try:
            member = membership_for(request)
        except (ValidationError, PermissionDenied):
            member = None
        match = request.resolver_match
        audit(
            "ADMIN_ACCESS_DENIED",
            request.user,
            actor=request.user,
            organization=member.organization if member else None,
            details={
                "route": match.url_name if match else None,
                "method": request.method,
                "status": response.status_code,
            },
        )
    except DatabaseError:
        log.error("audit_authorization_denial_failed")
    return response
