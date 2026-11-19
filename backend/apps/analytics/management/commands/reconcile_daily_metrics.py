from datetime import date, timedelta
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.analytics.dirty import mark_dirty
from apps.analytics.services import reconcile_pending
from apps.institutions.models import School


def parse_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise CommandError("Use o formato AAAA-MM-DD.") from exc


class Command(BaseCommand):
    help = (
        "Reconcilia indicadores pendentes e permite enfileirar um intervalo histórico."
    )

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)
        parser.add_argument("--from", dest="start", type=parse_date)
        parser.add_argument("--to", dest="end", type=parse_date)
        parser.add_argument("--school")

    def handle(self, *args, **options):
        start, end, school = options["start"], options["end"], options["school"]
        limit = options["limit"]
        if not 1 <= limit <= 1000:
            raise CommandError("--limit deve estar entre 1 e 1000.")
        if start or end or school:
            if (
                not start
                or not end
                or not date(1900, 1, 1) <= start <= end <= timezone.localdate()
            ):
                raise CommandError("Informe --from e --to com um intervalo válido.")
            schools = School.objects.all()
            if school:
                try:
                    schools = schools.filter(pk=UUID(school))
                except ValueError as exc:
                    raise CommandError("--school deve ser um UUID.") from exc
                if not schools.exists():
                    raise CommandError("Escola não encontrada.")
            else:
                schools = schools.filter(is_active=True)
            days = (end - start).days + 1
            size = days * schools.count()
            if size > 10000:
                raise CommandError("Limite de 10.000 combinações por operação.")
            for school_id in schools.values_list("id", flat=True).iterator():
                mark_dirty(
                    (school_id, start + timedelta(days=offset))
                    for offset in range(days)
                )
            self.stdout.write(f"Enfileirados {size} pares de escola e data.")
        success, failures = reconcile_pending(limit)
        self.stdout.write(f"Consolidados {success} dias; {failures} falhas.")
        if failures:
            raise CommandError(
                "Dias com falha permanecem disponíveis para nova tentativa."
            )
