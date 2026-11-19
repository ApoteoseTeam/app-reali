from django.utils import timezone

from .models import PendingDailyMetrics


def mark_dirty(keys):
    now = timezone.now()
    PendingDailyMetrics.objects.bulk_create(
        [
            PendingDailyMetrics(school_id=school, reference_date=day, queued_at=now)
            for school, day in sorted(set(keys))
        ],
        update_conflicts=True,
        update_fields=["queued_at"],
        unique_fields=["school", "reference_date"],
    )
