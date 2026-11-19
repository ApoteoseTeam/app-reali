from decimal import Decimal, ROUND_HALF_UP

from django.db.models import (
    BigIntegerField,
    Exists,
    OuterRef,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce

from apps.counting.models import CountAdjustment, CountKind, PlateCount
from apps.meals.models import DataQuality, MealService

from .models import DailyMetrics, PendingDailyMetrics


def percent(numerator, denominator):
    if not denominator:
        return None
    return (Decimal(100) * numerator / denominator).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def errors(predicted, served):
    difference = (
        predicted - served if predicted is not None and served is not None else None
    )
    absolute = abs(difference) if difference is not None else None
    return {
        "forecast_difference": difference,
        "absolute_error": absolute,
        "percentage_error": percent(absolute, served) if absolute is not None else None,
        "percentage_error_reason": "INSUFFICIENT_DATA"
        if absolute is None
        else "ZERO_ACTUAL"
        if not served
        else None,
    }


def performance(count, absolute, actual):
    return {
        "compared_services": count,
        "sum_absolute_error": absolute if count else None,
        "mae": (Decimal(absolute) / count).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if count
        else None,
        "wape": percent(absolute, actual) if count else None,
        "wape_reason": "INSUFFICIENT_DATA"
        if not count
        else "ZERO_ACTUAL"
        if not actual
        else None,
    }


def daily_rows(schools):
    pending = PendingDailyMetrics.objects.filter(
        school_id=OuterRef("school_id"), reference_date=OuterRef("reference_date")
    )
    return DailyMetrics.objects.filter(school__in=schools).annotate(
        stale=Exists(pending)
    )


def meal_rows(schools):
    plates = PlateCount.objects.filter(
        meal_service=OuterRef("pk"), camera__school_id=OuterRef("school_id")
    )
    adjustments = CountAdjustment.objects.filter(
        meal_service=OuterRef("pk"),
        school_id=OuterRef("school_id"),
        camera__school_id=OuterRef("school_id"),
        event_type=CountKind.PLATE_SERVED,
    )
    raw = plates.order_by().values("meal_service_id").annotate(total=Sum("quantity"))
    manual = (
        adjustments.order_by().values("meal_service_id").annotate(total=Sum("delta"))
    )
    return (
        MealService.objects.filter(school__in=schools)
        .select_related("forecast", "attendance_snapshot")
        .annotate(
            actual_total=Coalesce(
                Subquery(raw.values("total")), Value(0), output_field=BigIntegerField()
            )
            + Coalesce(
                Subquery(manual.values("total")),
                Value(0),
                output_field=BigIntegerField(),
            ),
            actual_known=Exists(plates) | Exists(adjustments),
        )
    )


def meal_metrics(meal):
    forecast = getattr(meal, "forecast", None)
    snapshot = getattr(meal, "attendance_snapshot", None)
    predicted = forecast.forecast_plates if forecast else None
    served = meal.actual_total if meal.actual_known else None
    comparison = errors(predicted, served)
    eligible = (
        meal.status == MealService.Status.FINISHED
        and meal.serving_data_quality == DataQuality.COMPLETE
        and comparison["absolute_error"] is not None
    )
    return {
        "id": meal.pk,
        "school_id": meal.school_id,
        "reference_date": meal.date,
        "meal_type": meal.meal_type,
        "status": meal.status,
        "preparation_started_at": meal.preparation_started_at,
        "serving_started_at": meal.serving_started_at,
        "finished_at": meal.finished_at,
        "snapshot_entries": snapshot.total_student_entries if snapshot else None,
        "total_forecast_plates": predicted,
        "total_served_plates": served,
        "forecast_method": forecast.method if forecast else None,
        "data_quality": meal.serving_data_quality,
        "comparison_eligible": eligible,
        **comparison,
    }
