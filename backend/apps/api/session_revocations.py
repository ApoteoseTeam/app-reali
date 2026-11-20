from django.utils import timezone
from rest_framework_simplejwt.settings import api_settings

from apps.notifications.models import RevokedPushSession

# Keep the persisted claim and table names compatible with Phase 9.
SESSION_ID_CLAIM = "reali_push_session"


def is_revoked(session_id):
    return (
        bool(session_id)
        and RevokedPushSession.objects.filter(
            pk=session_id,
            expires_at__gt=timezone.now(),
        ).exists()
    )


def record_revocation(session_id):
    return RevokedPushSession.objects.update_or_create(
        pk=session_id,
        defaults={
            "expires_at": timezone.now()
            + api_settings.REFRESH_TOKEN_LIFETIME
            + api_settings.ACCESS_TOKEN_LIFETIME,
        },
    )
