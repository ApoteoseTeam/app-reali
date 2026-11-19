import logging
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from apps.api.audit import audit
from apps.cameras.models import Camera, OperationalStatus
from apps.cameras.monitoring import agent_status, operational_status
from apps.counting.models import CountKind
from apps.counting.queries import day_bounds, summarize_counts
from apps.meals.models import MealService
from apps.institutions.models import Organization, School

from .models import DailyMetrics, PendingDailyMetrics
from .selectors import meal_metrics, meal_rows

logger = logging.getLogger(__name__)


def calculate_daily_metrics(school, day, at):
    filters = {"date": day}
    entries = summarize_counts(
        school.organization_id, CountKind.STUDENT_ENTRY, [school.pk], filters
    )
    plates = summarize_counts(
        school.organization_id, CountKind.PLATE_SERVED, [school.pk], filters
    )
    meals = list(
        meal_rows([school.pk])
        .filter(date=day)
        .exclude(status=MealService.Status.CANCELLED)
    )
    facts = [meal_metrics(meal) for meal in meals]
    predicted = [
        row["total_forecast_plates"]
        for row in facts
        if row["total_forecast_plates"] is not None
    ]
    compared = [row for row in facts if row["comparison_eligible"]]
    deadline = day_bounds(day)[1] + timedelta(seconds=settings.COUNT_MAX_DELAY_SECONDS)
    complete = False
    if (
        at > deadline
        and meals
        and entries["last_updated"]
        and all(
            row["status"] == MealService.Status.FINISHED
            and row["total_served_plates"] is not None
            for row in facts
        )
    ):
        cameras = list(
            Camera.objects.filter(school=school, is_active=True).select_related(
                "edge_device__school__organization"
            )
        )
        complete = {camera.camera_type for camera in cameras} == set(
            Camera.CameraType.values
        ) and all(
            operational_status(camera, at) == OperationalStatus.ONLINE
            and agent_status(camera.edge_device, at) == OperationalStatus.ONLINE
            and camera.pending_events == 0
            for camera in cameras
        )
    return {
        "total_student_entries": entries["total"],
        "total_served_plates": plates["total"],
        "total_forecast_plates": sum(predicted),
        "has_entries": entries["last_updated"] is not None,
        "has_served": plates["last_updated"] is not None,
        "has_forecast": bool(predicted),
        "is_complete": complete,
        "eligible_services": len(meals),
        "compared_services": len(compared),
        "sum_absolute_error": sum(row["absolute_error"] for row in compared),
        "compared_served": sum(row["total_served_plates"] for row in compared),
    }


@transaction.atomic
def rebuild_daily_metrics(school, day, *, actor=None):
    if day > timezone.localdate():
        raise ValueError("A data de consolidação não pode ser futura.")
    if connection.vendor == "postgresql":
        # Administrative writes lock the organization before marking a day.
        # Acquire the audit FK's key lock first to keep the same lock order.
        table = connection.ops.quote_name(Organization._meta.db_table)
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT id FROM {table} WHERE id = %s FOR KEY SHARE",
                [school.organization_id],
            )
    School.objects.select_for_update(no_key=True).get(pk=school.pk)
    at = timezone.now()
    old = DailyMetrics.objects.filter(school=school, reference_date=day).first()
    if (
        actor
        and old
        and old.calculated_at
        and at - old.calculated_at < timedelta(seconds=30)
    ):
        if not PendingDailyMetrics.objects.filter(
            school=school, reference_date=day
        ).exists():
            return old
    pending, _ = PendingDailyMetrics.objects.select_for_update().get_or_create(
        school=school,
        reference_date=day,
        defaults={"queued_at": timezone.now},
    )
    at = timezone.now()
    values = calculate_daily_metrics(school, day, at)
    before = (
        {key: getattr(old, key) for key in values if key != "is_complete"}
        if old
        else {}
    )
    changed = any(before[key] != values[key] for key in before)
    status = (
        "REVISED"
        if old
        and (
            old.data_status == "REVISED"
            or (old.calculated_at and day < timezone.localdate() and changed)
        )
        else "COMPLETE"
        if values["is_complete"]
        else "PROVISIONAL"
    )
    row, _ = DailyMetrics.objects.update_or_create(
        school=school,
        reference_date=day,
        defaults={**values, "data_status": status, "calculated_at": at},
    )
    if (old and (changed or old.is_complete != row.is_complete)) or actor:
        audit(
            "DAILY_METRICS_REVISED" if old and changed else "DAILY_METRICS_REBUILT",
            row,
            actor=actor,
            organization=school.organization,
            details={
                "school_id": str(school.pk),
                "day": day.isoformat(),
                "before": before,
                "after": values,
            },
        )
    pending.delete()
    return row


def reconcile_pending(limit):
    today = timezone.localdate()
    pending = list(
        PendingDailyMetrics.objects.filter(reference_date__lte=today)
        .select_related("school__organization")
        .order_by("queued_at", "pk")[:limit]
    )
    overdue = timezone.now() - timedelta(hours=1)
    closing = DailyMetrics.objects.filter(
        is_complete=False,
        reference_date__gte=today
        - timedelta(days=max(7, settings.COUNT_MAX_DELAY_SECONDS // 86400 + 2)),
        reference_date__lt=today,
        calculated_at__lt=overdue,
        eligible_services__gt=0,
        has_entries=True,
        has_served=True,
    )
    candidates = {(row.school_id, row.reference_date): row for row in pending}
    for row in closing.select_related("school__organization").order_by(
        "calculated_at", "pk"
    )[: max(0, limit - len(pending))]:
        candidates.setdefault((row.school_id, row.reference_date), row)
    failures = 0
    for row in candidates.values():
        try:
            rebuild_daily_metrics(row.school, row.reference_date)
        except Exception:
            failures += 1
            logger.exception(
                "Falha na consolidação escola=%s data=%s",
                row.school_id,
                row.reference_date,
            )
    return len(candidates) - failures, failures
