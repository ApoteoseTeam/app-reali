from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.counting.models import CountKind
from apps.counting.queries import day_bounds, summarize_counts
from apps.meals.models import MealService, AttendanceSnapshot, MealForecast
from apps.analytics.models import DailyMetrics


@transaction.atomic
def start_meal(meal_id, user, ratio):
    meal = MealService.objects.select_for_update().get(pk=meal_id)
    if meal.status != MealService.Status.PLANNED:
        raise ValidationError(
            {"status": "Apenas serviços planejados podem iniciar preparo."}
        )
    now = timezone.now()
    day_start, day_end = day_bounds(meal.date)
    entries = summarize_counts(
        meal.school.organization_id,
        CountKind.STUDENT_ENTRY,
        [meal.school_id],
        {"start_at": day_start, "end_at": min(now, day_end)},
    )["total"]
    snapshot = AttendanceSnapshot.objects.create(
        meal_service=meal, reference_time=now, total_student_entries=entries
    )
    forecast = (Decimal(entries) * ratio).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    MealForecast.objects.create(
        meal_service=meal,
        attendance_snapshot=snapshot,
        forecast_plates=int(forecast),
        estimated_plates_per_entry=ratio,
        generated_by=user,
    )
    meal.status = MealService.Status.PREPARING
    meal.preparation_started_at = now
    meal.save(update_fields=["status", "preparation_started_at", "updated_at"])
    return meal


@transaction.atomic
def advance_meal(meal_id, expected, next_status, timestamp_field):
    meal = MealService.objects.select_for_update().get(pk=meal_id)
    if meal.status != expected:
        raise ValidationError({"status": f"Esperado {expected}."})
    setattr(meal, timestamp_field, timezone.now())
    meal.status = next_status
    meal.save(update_fields=["status", timestamp_field, "updated_at"])
    return meal


def rebuild_daily_metrics(school, day):
    filters = {"date": day}
    total_student = summarize_counts(
        school.organization_id, CountKind.STUDENT_ENTRY, [school.pk], filters
    )["total"]
    total_plates = summarize_counts(
        school.organization_id, CountKind.PLATE_SERVED, [school.pk], filters
    )["total"]
    forecast = (
        MealForecast.objects.filter(
            meal_service__school=school, meal_service__date=day
        ).aggregate(n=Sum("forecast_plates"))["n"]
        or 0
    )
    obj, _ = DailyMetrics.objects.update_or_create(
        school=school,
        reference_date=day,
        defaults={
            "total_student_entries": total_student,
            "total_served_plates": total_plates,
            "total_forecast_plates": forecast,
            "calculated_at": timezone.now(),
        },
    )
    return obj
