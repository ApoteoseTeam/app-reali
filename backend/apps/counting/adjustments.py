from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.api.audit import audit
from apps.api.permissions import require_role, schools_for
from apps.cameras.models import Camera
from apps.institutions.models import Organization
from apps.meals.models import MealService
from apps.users.models import Membership

from .ingestion import camera_kind
from .models import CountAdjustment, CountKind, PlateCount, StudentCount


def lock_adjustment_scope(member):
    org = (
        Organization.objects.select_for_update()
        .filter(pk=member.organization_id, is_active=True)
        .first()
    )
    current = Membership.objects.filter(
        pk=member.pk, is_active=True, user__is_active=True
    ).first()
    if not org or not current:
        raise PermissionDenied("Vínculo indisponível.")
    return schools_for(require_role(current, "adjust_counts"))


def locked_camera(camera_id, schools):
    camera = (
        Camera.objects.select_for_update(no_key=True)
        .filter(pk=camera_id, school__in=schools)
        .first()
    )
    if not camera:
        raise NotFound("Câmera não encontrada no seu escopo.")
    return camera


def count_reference(kind, count_id, schools):
    model = StudentCount if kind == CountKind.STUDENT_ENTRY else PlateCount
    counts = model.objects.filter(pk=count_id, camera__school__in=schools)
    if model is PlateCount:
        counts = counts.filter(meal_service__school__in=schools)
    count = counts.first()
    if not count:
        raise NotFound("Contagem não encontrada no seu escopo.")
    return count


def ensure_nonnegative(delta, count, reference):
    total = (
        CountAdjustment.objects.filter(**reference).aggregate(value=Sum("delta"))[
            "value"
        ]
        or 0
    )
    if count.quantity + total + delta < 0:
        raise ValidationError({"delta": "A contagem ajustada não pode ficar negativa."})


def persist_adjustment(
    actor,
    camera,
    *,
    kind,
    recorded_at,
    meal_service_id,
    delta,
    reason,
    reference,
    reversal_of=None,
):
    adjustment = CountAdjustment.objects.create(
        actor=actor,
        school_id=camera.school_id,
        camera=camera,
        event_type=kind,
        recorded_at=recorded_at,
        meal_service_id=meal_service_id,
        delta=delta,
        reason=reason,
        reversal_of=reversal_of,
        **reference,
    )
    audit(
        "COUNT_ADJUSTMENT_REVERSED" if reversal_of else "COUNT_ADJUSTMENT_CREATED",
        adjustment,
        actor=actor,
        organization=camera.school.organization,
        details={
            "camera_id": str(camera.pk),
            "delta": delta,
            "reversal_of": str(reversal_of.pk) if reversal_of else None,
        },
    )
    return adjustment


@transaction.atomic
def create_adjustment(member, data):
    schools = lock_adjustment_scope(member).filter(is_active=True)
    kind = data["event_type"]
    count_id = data.get("count_id")
    reference = {}
    if count_id is not None:
        count = count_reference(kind, count_id, schools)
        camera = locked_camera(count.camera_id, schools)
        reference = (
            {"student_count": count}
            if kind == CountKind.STUDENT_ENTRY
            else {"plate_count": count}
        )
        ensure_nonnegative(data["delta"], count, reference)
        recorded_at = count.recorded_at
        meal_id = getattr(count, "meal_service_id", None)
    else:
        camera = locked_camera(data["camera_id"], schools)
        recorded_at = data["recorded_at"]
        meal_id = data.get("meal_service_id")
        if camera_kind(camera) != kind:
            raise ValidationError(
                {"event_type": "O tipo do evento não corresponde à câmera."}
            )
        if recorded_at > timezone.now():
            raise ValidationError(
                {"recorded_at": "A correção deve pertencer a um período já ocorrido."}
            )
        if meal_id:
            meal = (
                MealService.objects.select_for_update(no_key=True)
                .filter(pk=meal_id, school_id=camera.school_id)
                .first()
            )
            if not meal:
                raise NotFound("Serviço não encontrado nesta escola.")
            if timezone.localdate(recorded_at) != meal.date or meal.status not in {
                MealService.Status.SERVING,
                MealService.Status.FINISHED,
            }:
                raise ValidationError(
                    {
                        "meal_service_id": "Informe um serviço em distribuição ou finalizado na data da correção."
                    }
                )
    return persist_adjustment(
        member.user,
        camera,
        kind=kind,
        recorded_at=recorded_at,
        meal_service_id=meal_id,
        delta=data["delta"],
        reason=data["reason"],
        reference=reference,
    )


@transaction.atomic
def reverse_adjustment(member, adjustment_id, reason):
    schools = lock_adjustment_scope(member)
    original = CountAdjustment.objects.filter(
        pk=adjustment_id, school__in=schools, camera__school__in=schools
    ).first()
    if not original:
        raise NotFound("Ajuste não encontrado no seu escopo.")
    camera = locked_camera(original.camera_id, schools)
    if (
        original.reversal_of_id
        or CountAdjustment.objects.filter(reversal_of=original).exists()
    ):
        raise ValidationError("O ajuste já tem reversão ou é uma reversão.")
    reference = {}
    if original.student_count_id or original.plate_count_id:
        count = (
            original.student_count
            if original.student_count_id
            else original.plate_count
        )
        reference = (
            {"student_count": count}
            if original.student_count_id
            else {"plate_count": count}
        )
        ensure_nonnegative(-original.delta, count, reference)
    return persist_adjustment(
        member.user,
        camera,
        kind=original.event_type,
        recorded_at=original.recorded_at,
        meal_service_id=original.meal_service_id,
        delta=-original.delta,
        reason=reason,
        reference=reference,
        reversal_of=original,
    )
