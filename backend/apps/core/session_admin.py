from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from apps.core.admin import OperationsReadOnlyAdmin


class SessionAdmin(OperationsReadOnlyAdmin):
    reali_label = "Sessões registradas"
    fields = ("user", "jti", "created_at", "expires_at")
    list_display = ("user", "jti", "created_at", "expires_at")
    list_filter = ("expires_at",)
    list_select_related = ("user",)
    search_fields = ("user__email", "=jti")
    ordering = ("-created_at",)


class RevokedSessionAdmin(OperationsReadOnlyAdmin):
    reali_label = "Sessões revogadas"
    fields = ("token", "blacklisted_at")
    list_display = ("token", "blacklisted_at")
    list_filter = ("blacklisted_at",)
    list_select_related = ("token", "token__user")
    search_fields = ("token__user__email", "=token__jti")
    ordering = ("-blacklisted_at",)


def register_session_admin(site):
    site.unregister((OutstandingToken, BlacklistedToken))
    site.register(OutstandingToken, SessionAdmin)
    site.register(BlacklistedToken, RevokedSessionAdmin)
