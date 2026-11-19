from datetime import datetime, time

from django.db.models import BigIntegerField, Max, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.institutions.models import Organization

from .models import CountAdjustment, CountKind, PlateCount, StudentCount


def day_bounds(day):
    tz = timezone.get_current_timezone()
    return tuple(
        timezone.make_aware(datetime.combine(day, limit), tz)
        for limit in (time.min, time.max)
    )


def count_querysets(kind, schools, filters):
    model = StudentCount if kind == CountKind.STUDENT_ENTRY else PlateCount
    counts = model.objects.filter(camera__school__in=schools)
    adjustments = CountAdjustment.objects.filter(
        school__in=schools, camera__school__in=schools, event_type=kind
    )
    if kind == CountKind.PLATE_SERVED:
        counts = counts.filter(meal_service__school__in=schools)
        adjustments = adjustments.filter(meal_service__school__in=schools)
    if "school" in filters:
        counts = counts.filter(camera__school_id=filters["school"])
        adjustments = adjustments.filter(school_id=filters["school"])
    for name in ("camera", "meal_service"):
        if name in filters:
            counts = counts.filter(**{f"{name}_id": filters[name]})
            adjustments = adjustments.filter(**{f"{name}_id": filters[name]})
    if "date" in filters:
        lo, hi = day_bounds(filters["date"])
        counts = counts.filter(recorded_at__range=(lo, hi))
        adjustments = adjustments.filter(recorded_at__range=(lo, hi))
    if "known_at" in filters:
        counts = counts.annotate(
            available_at=Coalesce("deviceingestionevent__received_at", "created_at")
        ).filter(available_at__lte=filters["known_at"])
        adjustments = adjustments.filter(created_at__lte=filters["known_at"])
    for name, lookup in (
        ("start_at", "recorded_at__gte"),
        ("end_at", "recorded_at__lte"),
    ):
        if name in filters:
            counts = counts.filter(**{lookup: filters[name]})
            adjustments = adjustments.filter(**{lookup: filters[name]})
    return counts, adjustments


def summarize_counts(organization_id, kind, schools, filters):
    counts, adjustments = count_querysets(kind, schools, filters)
    # Use one SQL statement so automatic counts and adjustments share a database snapshot.
    raw = (
        counts.order_by()
        .annotate(bucket=Value(1))
        .values("bucket")
        .annotate(
            automatic=Sum(
                "quantity",
                filter=Q(source=StudentCount.Source.AUTOMATIC),
                output_field=BigIntegerField(),
            ),
            legacy_manual=Sum(
                "quantity",
                filter=Q(source=StudentCount.Source.MANUAL),
                output_field=BigIntegerField(),
            ),
            latest_raw=Max("updated_at"),
            last_source_event_at=Max(
                "recorded_at", filter=Q(source=StudentCount.Source.AUTOMATIC)
            ),
        )
    )
    manual = (
        adjustments.order_by()
        .annotate(bucket=Value(1))
        .values("bucket")
        .annotate(
            adjustment=Sum("delta", output_field=BigIntegerField()),
            latest_manual=Max("created_at"),
        )
    )
    result = (
        Organization.objects.filter(pk=organization_id)
        .annotate(
            automatic=Coalesce(
                Subquery(raw.values("automatic")),
                Value(0),
                output_field=BigIntegerField(),
            ),
            legacy_manual=Coalesce(
                Subquery(raw.values("legacy_manual")),
                Value(0),
                output_field=BigIntegerField(),
            ),
            adjustment=Coalesce(
                Subquery(manual.values("adjustment")),
                Value(0),
                output_field=BigIntegerField(),
            ),
            latest_raw=Subquery(raw.values("latest_raw")),
            latest_manual=Subquery(manual.values("latest_manual")),
            last_source_event_at=Subquery(raw.values("last_source_event_at")),
        )
        .values(
            "automatic",
            "legacy_manual",
            "adjustment",
            "latest_raw",
            "latest_manual",
            "last_source_event_at",
        )
        .get()
    )
    latest = [
        value
        for value in (result.pop("latest_raw"), result.pop("latest_manual"))
        if value is not None
    ]
    return {
        **result,
        "total": result["automatic"] + result["legacy_manual"] + result["adjustment"],
        "last_updated": max(latest, default=None),
    }
