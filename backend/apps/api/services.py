from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.utils.timezone import make_aware
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.cameras.models import Camera
from apps.counting.models import StudentCount, PlateCount
from apps.meals.models import MealService, AttendanceSnapshot, MealForecast
from apps.analytics.models import DailyMetrics


def day_bounds(day):
    tz = timezone.get_current_timezone()
    return make_aware(datetime.combine(day, time.min), tz), make_aware(
        datetime.combine(day, time.max), tz
    )


@transaction.atomic
def start_meal(meal_id, user, ratio):
    meal = MealService.objects.select_for_update().get(pk=meal_id)
    if meal.status != MealService.Status.PLANNED:
        raise ValidationError(
            {"status": "Apenas serviços planejados podem iniciar preparo."}
        )
    now = timezone.now()
    day_start, day_end = day_bounds(meal.date)
    entries = (
        StudentCount.objects.filter(
            camera__school=meal.school,
            recorded_at__range=(day_start, min(now, day_end)),
        ).aggregate(n=Sum("quantity"))["n"]
        or 0
    )
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
    start, end = day_bounds(day)
    total_student = (
        StudentCount.objects.filter(
            camera__school=school, recorded_at__range=(start, end)
        ).aggregate(n=Sum("quantity"))["n"]
        or 0
    )
    total_plates = (
        PlateCount.objects.filter(
            camera__school=school,
            meal_service__school=school,
            recorded_at__range=(start, end),
        ).aggregate(n=Sum("quantity"))["n"]
        or 0
    )
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


@transaction.atomic
def record_device_event(camera, data):
    # Serialize ingestion and identity updates for this camera.
    camera = Camera.objects.select_for_update().get(pk=camera.pk)
    if (
        not camera.is_active
        or not camera.school.is_active
        or not camera.school.organization.is_active
    ):
        raise PermissionDenied("Câmera indisponível.")

    meal_id = data.get("meal_service")
    if camera.camera_type == Camera.CameraType.ENTRANCE:
        if meal_id is not None:
            raise ValidationError({"meal_service": "Entrada não recebe meal_service."})
        model = StudentCount
    else:
        if meal_id is None:
            raise ValidationError(
                {"meal_service": "Obrigatório para contagem de pratos."}
            )
        model = PlateCount

    existing = model.objects.filter(
        camera=camera, external_event_id=data["event_id"]
    ).first()
    if existing:
        if (
            existing.quantity != data["quantity"]
            or existing.recorded_at != data["recorded_at"]
            or getattr(existing, "meal_service_id", None) != meal_id
        ):
            raise ValidationError(
                {"event_id": "ID reutilizado com conteúdo diferente."}
            )
        return existing, False

    if data["recorded_at"] > timezone.now() + timedelta(minutes=5):
        raise ValidationError({"recorded_at": "Evento no futuro."})
    fields = {
        "camera": camera,
        "external_event_id": data["event_id"],
        "quantity": data["quantity"],
        "recorded_at": data["recorded_at"],
    }
    if meal_id is not None:
        meal = (
            MealService.objects.select_for_update()
            .filter(
                id=meal_id,
                school_id=camera.school_id,
                status=MealService.Status.SERVING,
            )
            .first()
        )
        if meal is None:
            raise ValidationError(
                {
                    "meal_service": "Informe um serviço em distribuição na escola da câmera."
                }
            )
        fields["meal_service"] = meal
    return model.objects.create(**fields), True
