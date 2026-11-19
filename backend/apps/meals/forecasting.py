from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from statistics import median

from django.conf import settings
from django.db.models import Count, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.cameras.models import Camera, CameraHealthEvent, OperationalStatus
from apps.cameras.monitoring import agent_status, operational_status
from apps.counting.models import CountAdjustment, CountKind, PlateCount
from apps.counting.queries import day_bounds, summarize_counts

from .models import (
    AttendanceSnapshot,
    DataQuality,
    MealForecast,
    MealForecastPolicy,
    MealService,
)

VERSION = "reali-meal-v1"
RATE_SCALE = Decimal("0.001")
MAX_RATE = Decimal("5")
SAMPLE_LIMIT = 30
CUTOFF_TOLERANCE = timedelta(hours=1)


def camera_quality(school, camera_type, start, end, observed_at, *, has_data=False):
    cameras = list(
        Camera.objects.filter(school=school, camera_type=camera_type, is_active=True)
        .select_related("edge_device__school__organization")
        .order_by("id")
    )
    gaps = set(
        CameraHealthEvent.objects.filter(
            camera__in=cameras,
            occurred_at__range=(start, end),
            created_at__lte=observed_at,
            new_status__in=(
                OperationalStatus.OFFLINE,
                OperationalStatus.ERROR,
                OperationalStatus.DEGRADED,
            ),
        ).values_list("camera_id", flat=True)
    )
    observations = []
    for camera in cameras:
        observed = camera.last_seen_at
        status = operational_status(camera, observed_at)
        agent = agent_status(camera.edge_device, observed_at)
        observed_online = (
            status == OperationalStatus.ONLINE
            and agent == OperationalStatus.ONLINE
            and observed is not None
            and start <= observed <= end
        )
        observations.append(
            {
                "camera_id": str(camera.pk),
                "status": status,
                "agent_status": agent,
                "last_seen_at": observed.isoformat() if observed else None,
                "health_gap": camera.pk in gaps,
                "observed_online": observed_online,
                "within_policy": observed_online and camera.pk not in gaps,
            }
        )
    if start > end:
        quality = DataQuality.UNAVAILABLE
    elif observations and all(item["within_policy"] for item in observations):
        quality = DataQuality.COMPLETE
    elif any(item["observed_online"] for item in observations):
        quality = DataQuality.PARTIAL
    elif any(
        item["status"] == OperationalStatus.OFFLINE
        or item["agent_status"] == OperationalStatus.OFFLINE
        for item in observations
    ):
        quality = DataQuality.STALE
    else:
        quality = DataQuality.PARTIAL if has_data else DataQuality.UNAVAILABLE
    return quality, observations


def create_snapshot(meal, user, cutoff):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(
        datetime.combine(meal.date, meal.entry_window_start or time.min), tz
    )
    end = min(cutoff, day_bounds(meal.date)[1])
    summary = summarize_counts(
        meal.school.organization_id,
        CountKind.STUDENT_ENTRY,
        [meal.school_id],
        {"start_at": start, "end_at": end, "known_at": cutoff},
    )
    has_data = bool(summary["last_updated"])
    quality, cameras = camera_quality(
        meal.school, Camera.CameraType.ENTRANCE, start, end, cutoff, has_data=has_data
    )
    return AttendanceSnapshot.objects.create(
        meal_service=meal,
        reference_time=cutoff,
        window_start_at=start,
        window_end_at=end,
        total_student_entries=summary["total"],
        last_source_event_at=summary["last_source_event_at"],
        data_quality_status=quality,
        created_by=user,
        metadata={
            "timezone": timezone.get_current_timezone_name(),
            "available_at_or_before": cutoff.isoformat(),
            "automatic_entries": summary["automatic"],
            "legacy_manual_entries": summary["legacy_manual"],
            "adjustment_entries": summary["adjustment"],
            "has_count_data": has_data,
            "camera_offline_seconds": settings.CAMERA_OFFLINE_TIMEOUT_SECONDS,
            "cameras": cameras,
        },
    )


def historical_candidates(meal, snapshot, days):
    cutoff = snapshot.reference_time
    rows = (
        PlateCount.objects.filter(
            meal_service_id=OuterRef("pk"),
            camera__school_id=meal.school_id,
            recorded_at__range=(
                OuterRef("serving_started_at"),
                OuterRef("finished_at"),
            ),
        )
        .annotate(known_at=Coalesce("deviceingestionevent__received_at", "created_at"))
        .filter(
            known_at__lte=cutoff,
        )
        .order_by()
        .values("meal_service_id")
        .annotate(
            plates=Sum("quantity"),
            automatic=Count("pk", filter=Q(source=PlateCount.Source.AUTOMATIC)),
        )
    )
    adjustments = (
        CountAdjustment.objects.filter(
            meal_service_id=OuterRef("pk"),
            school_id=meal.school_id,
            camera__school_id=meal.school_id,
            event_type=CountKind.PLATE_SERVED,
            created_at__lte=cutoff,
            recorded_at__range=(
                OuterRef("serving_started_at"),
                OuterRef("finished_at"),
            ),
        )
        .order_by()
        .values("meal_service_id")
        .annotate(delta=Sum("delta"))
    )
    window_filter = Q(entry_window_start=meal.entry_window_start or time.min)
    if not meal.entry_window_start or meal.entry_window_start == time.min:
        window_filter |= Q(entry_window_start__isnull=True)
    return (
        MealService.objects.filter(
            window_filter,
            school_id=meal.school_id,
            meal_type=meal.meal_type,
            scheduled_time=meal.scheduled_time,
            scheduled_end_time=meal.scheduled_end_time,
            created_at__lte=cutoff,
            date__gte=date.fromordinal(max(1, meal.date.toordinal() - days)),
            date__lt=meal.date,
            history_excluded=False,
            status=MealService.Status.FINISHED,
            finished_at__lte=cutoff,
            serving_started_at__isnull=False,
            serving_data_quality=DataQuality.COMPLETE,
            attendance_snapshot__data_quality_status=DataQuality.COMPLETE,
            attendance_snapshot__total_student_entries__gt=0,
            attendance_snapshot__created_at__lte=cutoff,
            attendance_snapshot__reference_time__lte=cutoff,
            attendance_snapshot__window_start_at__isnull=False,
            attendance_snapshot__window_end_at__isnull=False,
        )
        .annotate(
            plate_total=Subquery(rows.values("plates")),
            automatic_plate_events=Subquery(rows.values("automatic")),
            plate_delta=Coalesce(Subquery(adjustments.values("delta")), 0),
        )
        .filter(automatic_plate_events__gt=0)
        .select_related("attendance_snapshot")
        .order_by("-date", "-id")[: SAMPLE_LIMIT * 2]
    )


def comparable_samples(meal, snapshot, days):
    target_duration = snapshot.window_end_at - snapshot.window_start_at
    matches = []
    for candidate in historical_candidates(meal, snapshot, days):
        previous = candidate.attendance_snapshot
        duration = previous.window_end_at - previous.window_start_at
        if abs(duration - target_duration) > CUTOFF_TOLERANCE:
            continue
        served = candidate.plate_total + candidate.plate_delta
        entries = previous.total_student_entries
        if served < 0 or served > entries * MAX_RATE:
            continue
        matches.append((candidate, entries, served))
        if len(matches) == SAMPLE_LIMIT:
            break
    if len(matches) >= 5:
        ratios = [Decimal(served) / entries for _, entries, served in matches]
        typical = median(ratios)
        if typical > 0:
            matches = [
                row
                for row, ratio in zip(matches, ratios, strict=True)
                if typical / 3 <= ratio <= typical * 3
            ]
    return matches


def predict_plates(entries, rate):
    return int((Decimal(entries) * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def create_forecast(meal, snapshot, user, override_rate=None):
    policy = MealForecastPolicy.objects.filter(
        school=meal.school, meal_type=meal.meal_type
    ).first()
    minimum = policy.minimum_history if policy else 3
    days = policy.history_days if policy else 90
    initial = policy.initial_rate if policy else None
    entries = snapshot.total_student_entries
    parameters = {
        "rounding": "ROUND_HALF_UP",
        "rate_scale": str(RATE_SCALE),
        "maximum_empirical_rate": str(MAX_RATE),
        "minimum_history": minimum,
        "history_days": days,
        "sample_limit": SAMPLE_LIMIT,
        "cutoff_tolerance_seconds": int(CUTOFF_TOLERANCE.total_seconds()),
        "policy_id": str(policy.pk) if policy else None,
        "initial_rate": str(initial) if initial is not None else None,
        "entries": entries,
        "samples": [],
    }
    method = MealForecast.Method.UNAVAILABLE
    confidence = MealForecast.Confidence.INSUFFICIENT
    rate = None
    usable = (
        snapshot.data_quality_status == DataQuality.COMPLETE
        or snapshot.metadata["has_count_data"]
    )
    if not usable or snapshot.window_start_at > snapshot.window_end_at:
        parameters["reason"] = "ENTRY_DATA_UNAVAILABLE"
    elif override_rate is not None:
        rate, method = override_rate, MealForecast.Method.OVERRIDE_RATE
    else:
        samples = comparable_samples(meal, snapshot, days)
        parameters["samples"] = [
            {
                "meal_service_id": str(candidate.pk),
                "snapshot_id": str(candidate.attendance_snapshot.pk),
                "entries": sample_entries,
                "served_plates": served,
            }
            for candidate, sample_entries, served in samples
        ]
        if len(samples) >= minimum:
            rate = Decimal(sum(row[2] for row in samples)) / sum(
                row[1] for row in samples
            )
            method = MealForecast.Method.HISTORICAL_RATE
        elif initial is not None:
            rate, method = initial, MealForecast.Method.CONFIGURED_RATE
        else:
            parameters["reason"] = "INSUFFICIENT_HISTORY_AND_NO_INITIAL_RATE"
    if rate is not None:
        rate = rate.quantize(RATE_SCALE, rounding=ROUND_HALF_UP)
        confidence = (
            MealForecast.Confidence.SUFFICIENT
            if method == MealForecast.Method.HISTORICAL_RATE
            and snapshot.data_quality_status == DataQuality.COMPLETE
            else MealForecast.Confidence.PRELIMINARY
        )
    return MealForecast.objects.create(
        meal_service=meal,
        attendance_snapshot=snapshot,
        generated_by=user,
        method=method,
        confidence_status=confidence,
        algorithm_version=VERSION,
        parameters=parameters,
        estimated_plates_per_entry=rate,
        forecast_plates=predict_plates(entries, rate) if rate is not None else None,
    )
