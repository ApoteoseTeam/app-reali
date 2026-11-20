from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.analytics.models import PendingDailyMetrics
from apps.api.invitation_service import expire_invitation
from apps.api.models import UserInvitation
from apps.cameras.models import Camera, EdgeDevice, OperationalStatus as Health
from apps.cameras.monitoring import agent_status, offline_after, operational_status
from apps.institutions.models import Organization
from apps.meals.models import MealService

from .events import invitation_event, meal_event, metrics_event
from .models import AlertIncident, AlertScan, Kind, Priority
from .services import publish


def incident_notice(instance, incident, kind, stage, title, message):
    data = (
        {"resource": "camera", "resource_id": str(instance.pk)}
        if isinstance(instance, Camera)
        else {}
    )
    publish(
        kind,
        organization_id=instance.school.organization_id,
        school_id=instance.school_id,
        key=f"incident:{incident.pk}:{incident.opened_at.isoformat()}:{stage}",
        title=title,
        message=message,
        data=data,
        priority=Priority.CRITICAL if stage == "escalated" else None,
    )


def track(
    instance,
    source,
    condition,
    now,
    *,
    fault_at,
    healthy,
    kind,
    message,
    recovered_at=None,
    recover=False,
):
    incident = (
        AlertIncident.objects.select_for_update()
        .filter(
            source=source,
            source_id=instance.pk,
            condition=condition,
        )
        .first()
    )
    if incident is None:
        if fault_at is None:
            return
        incident, _ = AlertIncident.objects.select_for_update().get_or_create(
            source=source,
            source_id=instance.pk,
            condition=condition,
        )
    previous = incident.opened_at
    recovery = previous and (healthy or recovered_at and recovered_at > previous)
    if recovery:
        if incident.noticed and recover:
            incident_notice(
                instance,
                incident,
                Kind.CAMERA_RECOVERED,
                "recovered",
                "Comunicação da câmera restabelecida",
                "A câmera voltou a responder. Consulte seu estado atual.",
            )
        incident.opened_at = None
        incident.noticed = incident.escalated = False
    if fault_at is not None:
        if previous and recovery and recovered_at:
            fault_at = max(fault_at, recovered_at)
        incident.opened_at = incident.opened_at or fault_at
        elapsed = (now - incident.opened_at).total_seconds()
        if (
            not incident.noticed
            and elapsed >= settings.NOTIFICATION_ALERT_DELAY_SECONDS
        ):
            incident_notice(instance, incident, kind, "initial", kind.label, message)
            incident.noticed = True
        elif (
            incident.noticed
            and not incident.escalated
            and elapsed >= settings.NOTIFICATION_ESCALATION_SECONDS
        ):
            incident_notice(
                instance,
                incident,
                kind,
                "escalated",
                f"{kind.label} há mais tempo",
                f"{message} A falha permanece ativa.",
            )
            incident.escalated = True
    incident.save(update_fields=["opened_at", "noticed", "escalated", "updated_at"])


@transaction.atomic
def check_camera(pk, now):
    camera = (
        Camera.objects.filter(
            pk=pk,
            is_active=True,
            school__is_active=True,
            school__organization__is_active=True,
        )
        .select_related("school")
        .first()
    )
    if camera is None or camera.last_seen_at is None:
        return
    status = operational_status(camera, now)
    was_recovered = (
        camera.health_events.filter(
            new_status=Health.ONLINE,
        )
        .order_by("-occurred_at")
        .values_list("occurred_at", flat=True)
        .first()
    )
    if status == Health.OFFLINE:
        fault_at = camera.last_seen_at + offline_after()
        kind = Kind.CAMERA_OFFLINE
        message = "O heartbeat da câmera ultrapassou o limite de comunicação."
    elif status == Health.ERROR or (
        status == Health.DEGRADED and camera.telemetry_reason != "pending_events"
    ):
        fault_at = (
            camera.health_events.filter(
                new_status=status, event_type=camera.telemetry_reason
            )
            .order_by("-occurred_at")
            .values_list("occurred_at", flat=True)
            .first()
            or now
        )
        kind = Kind.CAMERA_ERROR
        message = {
            "video_unavailable": "O fluxo de vídeo está indisponível.",
            "detector_unavailable": "O detector está parado ou em falha.",
            "low_fps": "O processamento permaneceu abaixo do FPS esperado.",
            "warming_up": "O processamento permanece em inicialização.",
        }.get(
            camera.telemetry_reason,
            "A câmera reportou falha ou processamento degradado.",
        )
    else:
        fault_at, kind, message = None, Kind.CAMERA_ERROR, ""
    track(
        camera,
        "camera",
        "health",
        now,
        fault_at=fault_at,
        healthy=status != Health.OFFLINE and fault_at is None,
        kind=kind,
        message=message,
        recovered_at=was_recovered,
        recover=True,
    )
    pending = camera.pending_events if status != Health.OFFLINE else None
    sync_delayed = (
        pending is not None and pending >= settings.CAMERA_PENDING_EVENTS_LIMIT
    )
    track(
        camera,
        "camera",
        "sync",
        now,
        fault_at=now if sync_delayed else None,
        healthy=pending is not None and not sync_delayed,
        kind=Kind.DEVICE_SYNC_DELAY,
        message="O heartbeat informa uma fila de sincronização acima do limite.",
    )


@transaction.atomic
def check_agent(pk, now):
    agent = (
        EdgeDevice.objects.filter(pk=pk).select_related("school__organization").first()
    )
    if agent is None or agent.last_seen_at is None:
        return
    status = agent_status(agent, now)
    if status in {"DISABLED", Health.UNKNOWN}:
        return
    track(
        agent,
        "agent",
        "health",
        now,
        fault_at=agent.last_seen_at + offline_after()
        if status == Health.OFFLINE
        else None,
        healthy=status == Health.ONLINE,
        kind=Kind.DEVICE_OFFLINE,
        message="O agente deixou de enviar o heartbeat esperado.",
        recovered_at=agent.last_seen_at,
    )


@transaction.atomic
def check_meal(pk, now):
    organization_id = (
        MealService.objects.filter(pk=pk)
        .values_list("school__organization_id", flat=True)
        .first()
    )
    if (
        organization_id is None
        or not Organization.objects.select_for_update(no_key=True)
        .filter(
            pk=organization_id,
            is_active=True,
        )
        .exists()
    ):
        return
    meal = (
        MealService.objects.select_for_update(of=("self",), no_key=True)
        .select_related("school")
        .filter(
            pk=pk,
            status=MealService.Status.PLANNED,
            school__is_active=True,
            school__organization_id=organization_id,
        )
        .first()
    )
    if meal is None:
        return
    start = timezone.make_aware(datetime.combine(meal.date, meal.scheduled_time))
    if now <= start <= now + timedelta(minutes=settings.NOTIFICATION_REMINDER_MINUTES):
        meal_event(meal, Kind.MEAL_SERVICE_REMINDER)


@transaction.atomic
def check_invite(pk, now):
    organization_id = (
        UserInvitation.objects.filter(pk=pk)
        .values_list("organization_id", flat=True)
        .first()
    )
    if (
        organization_id is None
        or not Organization.objects.select_for_update(no_key=True)
        .filter(
            pk=organization_id,
            is_active=True,
        )
        .exists()
    ):
        return
    invite = UserInvitation.objects.filter(
        pk=pk, status=UserInvitation.Status.PENDING
    ).first()
    if invite and invite.expires_at <= now:
        expire_invitation(invite)
    elif invite and invite.expires_at <= now + timedelta(hours=12):
        invitation_event(invite, Kind.INVITATION_EXPIRING, "expiring")


@transaction.atomic
def check_pending(pk, now):
    pending = PendingDailyMetrics.objects.filter(pk=pk).select_related("school").first()
    if pending and pending.first_queued_at <= now - timedelta(
        minutes=settings.NOTIFICATION_STALE_MINUTES
    ):
        metrics_event(pending, Kind.DATA_STALE, key=f"daily-pending:{pending.pk}")


@transaction.atomic
def scan(name, candidates, limit):
    cursor, _ = AlertScan.objects.select_for_update().get_or_create(name=name)
    if cursor.last_source_id is not None:
        candidates = candidates.filter(pk__gt=cursor.last_source_id)
    ids = list(candidates.order_by("pk").values_list("pk", flat=True)[:limit])
    cursor.last_source_id = ids[-1] if len(ids) == limit else None
    cursor.save(update_fields=["last_source_id"])
    return ids


def check_due(now, limit):
    cutoff = now + timedelta(minutes=settings.NOTIFICATION_REMINDER_MINUTES)
    local_now, local_cutoff = timezone.localtime(now), timezone.localtime(cutoff)
    meal_window = Q(date=local_now.date(), scheduled_time__gte=local_now.time())
    if local_now.date() == local_cutoff.date():
        meal_window &= Q(scheduled_time__lte=local_cutoff.time())
    else:
        meal_window |= Q(
            date=local_cutoff.date(), scheduled_time__lte=local_cutoff.time()
        )
    targets = [
        (
            "camera",
            Camera.objects.filter(
                is_active=True,
                last_seen_at__isnull=False,
                school__is_active=True,
                school__organization__is_active=True,
            ),
            check_camera,
        ),
        (
            "agent",
            EdgeDevice.objects.filter(
                is_active=True,
                last_seen_at__isnull=False,
                school__is_active=True,
                school__organization__is_active=True,
            ),
            check_agent,
        ),
        (
            "meal",
            MealService.objects.filter(
                meal_window,
                status=MealService.Status.PLANNED,
                school__is_active=True,
                school__organization__is_active=True,
            ),
            check_meal,
        ),
        (
            "invite",
            UserInvitation.objects.filter(
                status=UserInvitation.Status.PENDING,
                organization__is_active=True,
                expires_at__lte=now + timedelta(hours=12),
            ),
            check_invite,
        ),
        (
            "metrics",
            PendingDailyMetrics.objects.filter(
                first_queued_at__lte=now
                - timedelta(minutes=settings.NOTIFICATION_STALE_MINUTES),
            ),
            check_pending,
        ),
    ]
    checked = 0
    for name, candidates, run in targets:
        for pk in scan(name, candidates, limit):
            run(pk, now)
            checked += 1
    return checked
