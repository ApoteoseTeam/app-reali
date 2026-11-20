from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ai.models import AIConversation, AIExecution, ExecutionStatus
from apps.ai.provider import option
from apps.ai.services import LEASE_SECONDS, expire_execution
from apps.institutions.models import Organization


class Command(BaseCommand):
    help = "Aplica a retenção do RealInova e recupera mensagens interrompidas."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=250)

    def handle(self, *args, **options):
        limit = options["limit"]
        try:
            conversation_days = int(option("CONVERSATION_RETENTION_DAYS", 30))
            telemetry_days = int(option("TELEMETRY_RETENTION_DAYS", 90))
            if not (
                1 <= limit <= 1000 and 2 <= conversation_days <= telemetry_days <= 365
            ):
                raise ValueError
        except (ValueError, TypeError):
            raise CommandError("Revise os limites de retenção do RealInova.") from None

        now = timezone.now()
        stale = AIExecution.objects.filter(
            status=ExecutionStatus.PENDING,
            created_at__lte=now - timedelta(seconds=LEASE_SECONDS),
        )
        expired_conversations = AIConversation.objects.filter(
            created_at__lt=now - timedelta(days=conversation_days)
        )
        expired_telemetry = AIExecution.objects.exclude(
            status=ExecutionStatus.PENDING
        ).filter(
            created_at__lt=now - timedelta(days=telemetry_days),
        )
        recovered = conversations = executions = 0
        for pk, organization_id in stale.order_by("created_at").values_list(
            "pk", "organization_id"
        )[:limit]:
            with transaction.atomic():
                Organization.objects.select_for_update(no_key=True).filter(
                    pk=organization_id
                ).first()
                row = stale.filter(pk=pk).first()
                if row:
                    expire_execution(row, now)
                    recovered += 1
        for pk, organization_id in expired_conversations.order_by(
            "created_at"
        ).values_list("pk", "organization_id")[:limit]:
            with transaction.atomic():
                Organization.objects.select_for_update(no_key=True).filter(
                    pk=organization_id
                ).first()
                rows = expired_conversations.filter(pk=pk).exclude(
                    aiexecution__status=ExecutionStatus.PENDING
                )
                conversations += rows.delete()[1].get("ai.AIConversation", 0)
        ids = list(
            expired_telemetry.order_by("created_at").values_list("pk", flat=True)[
                :limit
            ]
        )
        if ids:
            executions = (
                expired_telemetry.filter(pk__in=ids)
                .delete()[1]
                .get("ai.AIExecution", 0)
            )
        self.stdout.write(
            f"Execuções interrompidas: {recovered}. Conversas removidas: {conversations}. Telemetrias removidas: {executions}."
        )
