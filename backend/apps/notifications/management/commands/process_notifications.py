import logging
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.api.models import AuditLog

from ...alerts import check_due
from ...delivery import process_due
from ...models import Notification, PushDevice, RevokedPushSession

log = logging.getLogger(__name__)


def delete_batch(query, limit):
    keys = list(query.order_by("pk").values_list("pk", flat=True)[:limit])
    deleted, _ = query.filter(pk__in=keys).delete()
    return deleted


def prune(now, limit):
    cutoff = now - timedelta(days=settings.NOTIFICATION_RETENTION_DAYS)
    notices = delete_batch(Notification.objects.filter(created_at__lt=cutoff), limit)
    audit_cutoff = now - timedelta(days=settings.ADMIN_AUDIT_RETENTION_DAYS)
    audits = delete_batch(
        AuditLog.objects.filter(
            created_at__lt=audit_cutoff, countadjustment__isnull=True
        ),
        limit,
    )
    revoked = delete_batch(
        RevokedPushSession.objects.filter(expires_at__lte=now), limit
    )
    expired = list(
        PushDevice.objects.filter(is_active=True, session_expires_at__lte=now)
        .order_by(
            "session_expires_at",
            "pk",
        )
        .values_list("pk", flat=True)[:limit]
    )
    devices = PushDevice.objects.filter(
        pk__in=expired, is_active=True, session_expires_at__lte=now
    ).update(
        is_active=False,
        updated_at=now,
    )
    return notices, audits, revoked, devices


class Command(BaseCommand):
    help = "Avalia alertas, processa entregas e aplica a retenção das notificações do Reali."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument("--alerts-only", action="store_true")
        mode.add_argument("--delivery-only", action="store_true")
        mode.add_argument("--prune-only", action="store_true")

    def handle(self, *args, **options):
        limit = options["limit"]
        if not 1 <= limit <= 1000:
            raise CommandError("--limit deve estar entre 1 e 1000.")
        now = timezone.now()
        if options["prune_only"]:
            notices, audits, revoked, devices = prune(now, limit)
            summary = f"retenção notificações={notices} auditorias={audits} sessões={revoked} dispositivos={devices}"
        else:
            checked = 0 if options["delivery_only"] else check_due(now, limit)
            delivered = 0 if options["alerts_only"] else process_due(limit)
            summary = f"alertas verificados={checked} entregas processadas={delivered}"
        log.info("notifications_worker %s", summary)
        self.stdout.write(summary)
