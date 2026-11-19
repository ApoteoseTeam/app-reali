from datetime import date, time, timedelta
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import (
    APIException,
    NotFound,
    PermissionDenied,
    ValidationError,
)

from apps.analytics.dirty import mark_dirty
from apps.api.audit import audit
from apps.api.permissions import require_role, schools_for
from apps.cameras.models import Camera
from apps.counting.models import CountAdjustment
from apps.institutions.models import Organization
from apps.users.models import Membership

from .forecasting import camera_quality, create_forecast, create_snapshot
from .models import DataQuality, MealForecastPolicy, MealSchedule, MealService


class MealConflict(APIException):
    status_code = 409

    def __init__(self, code, message):
        super().__init__({"code": code, "detail": message})


def lock_actor(actor, action):
    organization = (
        Organization.objects.select_for_update()
        .filter(pk=actor.organization_id, is_active=True)
        .first()
    )
    member = (
        Membership.objects.select_related("user", "organization")
        .filter(
            pk=actor.pk,
            is_active=True,
            user__is_active=True,
        )
        .first()
    )
    if not organization or not member:
        raise PermissionDenied("Vínculo ou organização indisponível.")
    return require_role(member, action)


def active_school(actor, school_id):
    school = schools_for(actor, active_only=True).filter(pk=school_id).first()
    if not school:
        raise PermissionDenied(
            {
                "code": "SCHOOL_UNAVAILABLE",
                "detail": "Escola inativa ou fora do seu escopo.",
            }
        )
    return school


def locked_model(model, actor, pk):
    queryset = (
        model.objects.select_for_update(of=("self",))
        .select_related("school__organization")
        .filter(
            pk=pk,
            school__in=schools_for(actor),
        )
    )
    if model is MealService and actor.role == Membership.Role.COOK:
        queryset = queryset.filter(date__gte=timezone.localdate() - timedelta(days=29))
    result = queryset.first()
    if not result:
        raise NotFound("Recurso não encontrado no seu escopo.")
    return result


def fields_for_audit(instance, fields):
    result = {}
    for field in fields:
        value = getattr(instance, field)
        if isinstance(value, (date, time)):
            value = value.isoformat()
        elif field.endswith("_id") and value is not None:
            value = str(value)
        result[field] = value
    return result


def record_action(action, instance, actor, **details):
    audit(
        action,
        instance,
        actor=actor.user,
        organization=actor.organization,
        details={"school_id": str(instance.school_id), **details},
    )
    if isinstance(instance, MealService):
        keys = [(instance.school_id, instance.date)]
        before = details.get("before")
        if before:
            keys.append((UUID(before["school_id"]), date.fromisoformat(before["date"])))
        mark_dirty(keys)


def intersects(first_start, first_end, second_start, second_end):
    if first_start == second_start:
        return True
    if first_start < second_start:
        return first_end is not None and second_start < first_end
    return second_end is not None and first_start < second_end


def validate_times(start, end, window, *, end_field="end_time"):
    if end is not None and end <= start:
        raise ValidationError(
            {end_field: "O horário final deve ser posterior ao inicial no mesmo dia."}
        )
    if window is not None and window > start:
        raise ValidationError(
            {
                "entry_window_start": "A janela de entradas deve começar até o horário previsto."
            }
        )


SERVICE_FIELDS = (
    "school_id",
    "date",
    "meal_type",
    "scheduled_time",
    "scheduled_end_time",
    "entry_window_start",
    "history_excluded",
    "schedule_id",
)
SCHEDULE_FIELDS = (
    "meal_type",
    "name",
    "start_time",
    "end_time",
    "entry_window_start",
    "weekdays",
    "excluded_dates",
    "is_active",
)
POLICY_FIELDS = ("meal_type", "initial_rate", "minimum_history", "history_days")


def apply_service(actor, meal, data):
    created = meal._state.adding
    before = {} if created else fields_for_audit(meal, SERVICE_FIELDS)
    if not created and meal.status != MealService.Status.PLANNED:
        raise MealConflict(
            "INVALID_TRANSITION", "Somente serviços planejados podem ser editados."
        )
    if (
        not created
        and meal.schedule_id
        and "school" in data
        and data["school"].pk != meal.school_id
    ):
        raise ValidationError(
            {"school": "Um serviço vinculado mantém a escola original."}
        )
    if (
        not created
        and meal.schedule_id
        and "date" in data
        and data["date"] != meal.date
    ):
        raise ValidationError(
            {
                "date": "Um serviço vinculado mantém a data original. Crie uma exceção manual."
            }
        )
    for field, value in data.items():
        setattr(meal, field, value)
    active_school(actor, meal.school_id)
    validate_times(
        meal.scheduled_time,
        meal.scheduled_end_time,
        meal.entry_window_start,
        end_field="scheduled_end_time",
    )
    related = MealService.objects.filter(
        school=meal.school, date=meal.date, meal_type=meal.meal_type
    ).exclude(pk=meal.pk)
    for other in related.only("scheduled_time", "scheduled_end_time", "status"):
        if other.scheduled_time == meal.scheduled_time or (
            other.status != MealService.Status.CANCELLED
            and intersects(
                meal.scheduled_time,
                meal.scheduled_end_time,
                other.scheduled_time,
                other.scheduled_end_time,
            )
        ):
            raise MealConflict(
                "MEAL_SLOT_CONFLICT", "Já existe um serviço deste tipo no horário."
            )
    if created:
        meal.created_by = actor.user
    meal.save()
    record_action(
        "MEAL_SERVICE_CREATED" if created else "MEAL_SERVICE_CHANGED",
        meal,
        actor,
        before=before,
        after=fields_for_audit(meal, SERVICE_FIELDS),
    )
    return meal


@transaction.atomic
def save_service(actor, data, pk=None):
    actor = lock_actor(actor, "manage_meals")
    meal = locked_model(MealService, actor, pk) if pk else MealService()
    if pk:
        active_school(actor, meal.school_id)
    return apply_service(actor, meal, data)


@transaction.atomic
def save_schedule(actor, data, pk=None):
    actor = lock_actor(actor, "manage_meals")
    schedule = locked_model(MealSchedule, actor, pk) if pk else MealSchedule()
    before = fields_for_audit(schedule, SCHEDULE_FIELDS) if pk else {}
    if pk and "school" in data and schedule.school_id != data["school"].pk:
        raise ValidationError({"school": "A programação mantém a escola original."})
    for field, value in data.items():
        setattr(schedule, field, value)
    active_school(actor, schedule.school_id)
    validate_times(schedule.start_time, schedule.end_time, schedule.entry_window_start)
    if schedule.is_active:
        others = MealSchedule.objects.filter(
            school=schedule.school, meal_type=schedule.meal_type, is_active=True
        ).exclude(pk=schedule.pk)
        for other in others:
            if set(other.weekdays) & set(schedule.weekdays) and intersects(
                schedule.start_time,
                schedule.end_time,
                other.start_time,
                other.end_time,
            ):
                raise MealConflict(
                    "SCHEDULE_OVERLAP",
                    "Há uma programação ativa sobreposta para esse tipo e dia da semana.",
                )
    schedule.save()
    record_action(
        "MEAL_SCHEDULE_CHANGED" if pk else "MEAL_SCHEDULE_CREATED",
        schedule,
        actor,
        before=before,
        after=fields_for_audit(schedule, SCHEDULE_FIELDS),
    )
    return schedule


@transaction.atomic
def generate_service(actor, schedule_id, day):
    actor = lock_actor(actor, "manage_meals")
    schedule = locked_model(MealSchedule, actor, schedule_id)
    active_school(actor, schedule.school_id)
    found = MealService.objects.filter(schedule=schedule, date=day).first()
    if found:
        return found, False
    if (
        not schedule.is_active
        or day.isoweekday() not in schedule.weekdays
        or day.isoformat() in schedule.excluded_dates
    ):
        raise MealConflict(
            "SCHEDULE_NOT_APPLICABLE", "A programação não se aplica a esta data."
        )
    return apply_service(
        actor,
        MealService(schedule=schedule),
        {
            "school": schedule.school,
            "meal_type": schedule.meal_type,
            "date": day,
            "scheduled_time": schedule.start_time,
            "scheduled_end_time": schedule.end_time,
            "entry_window_start": schedule.entry_window_start,
        },
    ), True


@transaction.atomic
def save_policy(actor, data, pk=None):
    actor = lock_actor(actor, "forecast_policy")
    policy = locked_model(MealForecastPolicy, actor, pk) if pk else MealForecastPolicy()
    before = fields_for_audit(policy, POLICY_FIELDS) if pk else {}
    if pk and (
        "school" in data
        and data["school"].pk != policy.school_id
        or "meal_type" in data
        and data["meal_type"] != policy.meal_type
    ):
        raise ValidationError("A política mantém a escola e o tipo originais.")
    for field, value in data.items():
        setattr(policy, field, value)
    active_school(actor, policy.school_id)
    if (
        not pk
        and MealForecastPolicy.objects.filter(
            school=policy.school, meal_type=policy.meal_type
        ).exists()
    ):
        raise MealConflict(
            "POLICY_EXISTS", "Já existe uma política para esta escola e tipo."
        )
    policy.save()
    after = fields_for_audit(policy, POLICY_FIELDS)
    for values in (before, after):
        if values.get("initial_rate") is not None:
            values["initial_rate"] = str(values["initial_rate"])
    record_action(
        "MEAL_FORECAST_POLICY_CHANGED", policy, actor, before=before, after=after
    )
    return policy


def transition(meal, expected, next_status):
    if meal.status != expected:
        raise MealConflict(
            "INVALID_TRANSITION",
            f"A transição para {next_status} exige estado {expected}.",
        )
    meal.status = next_status


@transaction.atomic
def start_preparation(actor, meal_id, override_rate=None):
    actor = lock_actor(actor, "prepare")
    if override_rate is not None:
        require_role(actor, "manage_meals")
    meal = locked_model(MealService, actor, meal_id)
    active_school(actor, meal.school_id)
    if meal.status == MealService.Status.PREPARING:
        if not hasattr(meal, "attendance_snapshot") or not hasattr(meal, "forecast"):
            raise MealConflict(
                "LEGACY_PREPARATION_INCOMPLETE",
                "O preparo existente não possui snapshot e previsão consistentes.",
            )
        return meal
    now = timezone.now()
    if meal.date > timezone.localdate(now):
        raise MealConflict(
            "SERVICE_DATE_IN_FUTURE",
            "O preparo só pode começar a partir da data do serviço.",
        )
    transition(meal, MealService.Status.PLANNED, MealService.Status.PREPARING)
    if hasattr(meal, "attendance_snapshot") or hasattr(meal, "forecast"):
        raise MealConflict(
            "LEGACY_PREPARATION_INCOMPLETE",
            "O serviço planejado já possui dados de preparo. Revise o histórico.",
        )
    snapshot = create_snapshot(meal, actor.user, now)
    forecast = create_forecast(meal, snapshot, actor.user, override_rate)
    meal.preparation_started_at = now
    meal.preparation_started_by = actor.user
    meal.save(
        update_fields=[
            "status",
            "preparation_started_at",
            "preparation_started_by",
            "updated_at",
        ]
    )
    record_action(
        "MEAL_PREPARATION_STARTED",
        meal,
        actor,
        previous_status=MealService.Status.PLANNED,
        status=meal.status,
    )
    audit(
        "ATTENDANCE_SNAPSHOT_CREATED",
        snapshot,
        actor=actor.user,
        organization=actor.organization,
        details={
            "school_id": str(meal.school_id),
            "meal_service_id": str(meal.pk),
            "entries": snapshot.total_student_entries,
            "cutoff_at": now.isoformat(),
        },
    )
    audit(
        "MEAL_FORECAST_CREATED",
        forecast,
        actor=actor.user,
        organization=actor.organization,
        details={
            "school_id": str(meal.school_id),
            "meal_service_id": str(meal.pk),
            "method": forecast.method,
            "plates": forecast.forecast_plates,
        },
    )
    return meal


@transaction.atomic
def start_serving(actor, meal_id):
    actor = lock_actor(actor, "prepare")
    meal = locked_model(MealService, actor, meal_id)
    active_school(actor, meal.school_id)
    transition(meal, MealService.Status.PREPARING, MealService.Status.SERVING)
    meal.serving_started_at = timezone.now()
    meal.serving_started_by = actor.user
    meal.save(
        update_fields=[
            "status",
            "serving_started_at",
            "serving_started_by",
            "updated_at",
        ]
    )
    record_action(
        "MEAL_SERVING_STARTED",
        meal,
        actor,
        previous_status=MealService.Status.PREPARING,
        status=meal.status,
    )
    return meal


@transaction.atomic
def finish_service(actor, meal_id):
    actor = lock_actor(actor, "prepare")
    meal = locked_model(MealService, actor, meal_id)
    active_school(actor, meal.school_id)
    transition(meal, MealService.Status.SERVING, MealService.Status.FINISHED)
    meal.finished_at = timezone.now()
    meal.finished_by = actor.user
    quality, observations = DataQuality.UNAVAILABLE, []
    if meal.serving_started_at is not None:
        quality, observations = camera_quality(
            meal.school,
            Camera.CameraType.CAFETERIA,
            meal.serving_started_at,
            meal.finished_at,
            meal.finished_at,
            has_data=meal.plate_counts.exists(),
        )
    meal.serving_data_quality = quality
    meal.save(
        update_fields=[
            "status",
            "finished_at",
            "finished_by",
            "serving_data_quality",
            "updated_at",
        ]
    )
    record_action(
        "MEAL_SERVICE_FINISHED",
        meal,
        actor,
        previous_status=MealService.Status.SERVING,
        status=meal.status,
        serving_data_quality=quality,
        cameras=observations,
    )
    return meal


@transaction.atomic
def cancel_service(actor, meal_id, reason):
    actor = lock_actor(actor, "manage_meals")
    meal = locked_model(MealService, actor, meal_id)
    active_school(actor, meal.school_id)
    if (
        meal.status not in {MealService.Status.PLANNED, MealService.Status.PREPARING}
        or meal.plate_counts.exists()
        or CountAdjustment.objects.filter(meal_service=meal).exists()
    ):
        raise MealConflict(
            "CANCELLATION_NOT_ALLOWED",
            "Só é possível cancelar antes da distribuição e sem registros de pratos.",
        )
    previous = meal.status
    meal.status = MealService.Status.CANCELLED
    meal.cancelled_at = timezone.now()
    meal.cancelled_by = actor.user
    meal.cancellation_reason = reason
    meal.save(
        update_fields=[
            "status",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "updated_at",
        ]
    )
    record_action(
        "MEAL_SERVICE_CANCELLED",
        meal,
        actor,
        previous_status=previous,
        status=meal.status,
        reason=reason,
    )
    return meal
