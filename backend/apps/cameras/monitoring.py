from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .authentication import lock_authenticated_device, lock_legacy_camera
from .models import (
    Camera,
    CameraHealthEvent,
    DetectorStatus,
    OperationalStatus as Status,
    VideoStatus,
)
from .observability import log_device_event
from .provisioning import camera_event

MESSAGES = {
    "timeout": "Limite de comunicação excedido.",
    "video_unavailable": "Fluxo de vídeo indisponível.",
    "detector_unavailable": "Detector interrompido ou em falha.",
    "warming_up": "Captura ou processamento em inicialização.",
    "low_fps": "FPS de processamento abaixo do limite.",
    "pending_events": "Fila de sincronização acima do limite.",
    "healthy": "Vídeo e detector em funcionamento.",
}


def offline_after():
    return timedelta(seconds=settings.CAMERA_OFFLINE_TIMEOUT_SECONDS)


def agent_status(device, now):
    if device is None:
        return "UNASSIGNED"
    if (
        not device.is_active
        or not device.school.is_active
        or not device.school.organization.is_active
    ):
        return "DISABLED"
    if device.last_seen_at is None:
        return Status.UNKNOWN
    return (
        Status.OFFLINE
        if device.last_seen_at + offline_after() <= now
        else Status.ONLINE
    )


def operational_status(camera, now):
    if camera.last_seen_at is None:
        return Status.UNKNOWN
    if camera.last_seen_at + offline_after() <= now:
        return Status.OFFLINE
    if not (camera.video_status and camera.detector_status):
        return Status.UNKNOWN
    return classify_sample(camera)[0]


def classify_sample(camera):
    if camera.video_status in {VideoStatus.DISCONNECTED, VideoStatus.ERROR}:
        return Status.ERROR, "video_unavailable"
    if camera.detector_status in {DetectorStatus.STOPPED, DetectorStatus.ERROR}:
        return Status.ERROR, "detector_unavailable"
    if (
        camera.video_status == VideoStatus.STARTING
        or camera.detector_status == DetectorStatus.STARTING
    ):
        return Status.DEGRADED, "warming_up"
    if (
        camera.processing_fps is None
        or camera.processing_fps < settings.CAMERA_MIN_PROCESSING_FPS
    ):
        return Status.DEGRADED, "low_fps"
    if (camera.pending_events or 0) >= settings.CAMERA_PENDING_EVENTS_LIMIT:
        return Status.DEGRADED, "pending_events"
    return Status.ONLINE, "healthy"


def remember_timeout(camera, now):
    if (
        camera.health_status != Status.OFFLINE
        and operational_status(camera, now) == Status.OFFLINE
    ):
        camera_event(
            camera,
            "timeout",
            camera.health_status,
            Status.OFFLINE,
            MESSAGES["timeout"],
            camera.last_seen_at + offline_after(),
        )
        camera.health_status = Status.OFFLINE
        transaction.on_commit(
            lambda: log_device_event(
                "CAMERA_HEALTH_CHANGED", camera=camera, reason="timeout"
            )
        )
        return True
    return False


def camera_sample(camera, sample, device, now):
    remember_timeout(camera, now)
    previous_status = camera.health_status
    previous_reason = camera.telemetry_reason
    for field in (
        "video_status",
        "detector_status",
        "processing_fps",
        "pending_events",
    ):
        setattr(camera, field, sample[field])
    camera.last_seen_at = now
    camera.updated_at = now
    camera.health_status, camera.telemetry_reason = classify_sample(camera)
    if (
        previous_status != camera.health_status
        or previous_reason != camera.telemetry_reason
    ):
        reason = camera.telemetry_reason
        camera_event(
            camera, reason, previous_status, camera.health_status, MESSAGES[reason], now
        )
        if camera.health_status in {Status.ERROR, Status.DEGRADED}:
            transaction.on_commit(
                lambda: log_device_event(
                    "CAMERA_HEALTH_CHANGED", camera=camera, device=device, reason=reason
                )
            )


@transaction.atomic
def receive_heartbeat(credential, data):
    device, now = lock_authenticated_device(credential)
    samples = {sample["camera_id"]: sample for sample in data["cameras"]}
    cameras = list(
        Camera.objects.select_for_update()
        .filter(
            pk__in=samples,
            edge_device=device,
            school_id=device.school_id,
            is_active=True,
        )
        .order_by("pk")
    )
    if len(cameras) != len(samples):
        log_device_event(
            "CAMERA_SCOPE_REJECTED", device=device, reason="invalid_heartbeat_scope"
        )
        raise PermissionDenied(
            "Uma ou mais câmeras estão indisponíveis para este agente."
        )
    observed = data.get("observed_at", now)
    if observed > now + timedelta(
        seconds=settings.CAMERA_HEARTBEAT_MAX_CLOCK_SKEW_SECONDS
    ):
        raise ValidationError(
            {"observed_at": "Horário do agente adiantado além do limite."}
        )
    if observed < now - timedelta(
        seconds=settings.CAMERA_HEARTBEAT_MAX_AGE_SECONDS
    ) or (device.last_observed_at and observed <= device.last_observed_at):
        return {"status": "ok", "accepted": False, "updated_cameras": 0}
    for camera in cameras:
        camera_sample(camera, samples[camera.pk], device, now)
    Camera.objects.bulk_update(
        cameras,
        [
            "video_status",
            "detector_status",
            "processing_fps",
            "pending_events",
            "last_seen_at",
            "health_status",
            "telemetry_reason",
            "updated_at",
        ],
    )
    device.last_seen_at = now
    device.last_observed_at = observed
    device.agent_version = data["agent_version"]
    device.save(
        update_fields=[
            "last_seen_at",
            "last_observed_at",
            "agent_version",
            "updated_at",
        ]
    )
    return {"status": "ok", "accepted": True, "updated_cameras": len(cameras)}


@transaction.atomic
def legacy_heartbeat(credential):
    camera = lock_legacy_camera(credential)
    now = timezone.now()
    was_offline = (
        remember_timeout(camera, now) or camera.health_status == Status.OFFLINE
    )
    if was_offline:
        camera_event(
            camera,
            "legacy_reconnected",
            Status.OFFLINE,
            Status.UNKNOWN,
            "Comunicação legada retomada.",
            now,
        )
    camera.last_seen_at = now
    camera.health_status = Status.UNKNOWN
    camera.save(update_fields=["last_seen_at", "health_status", "updated_at"])
    return {"status": "ok", "camera_id": str(camera.pk)}


@transaction.atomic
def device_configuration(credential):
    device, _ = lock_authenticated_device(credential)
    cameras = list(
        device.cameras.select_for_update(of=("self",))
        .select_related("configuration")
        .filter(
            school=device.school,
            is_active=True,
        )
        .order_by("id")
    )
    return {
        "device_identifier": device.device_identifier,
        "heartbeat_interval_seconds": settings.CAMERA_HEARTBEAT_INTERVAL_SECONDS,
        "cameras": [
            {
                "id": camera.pk,
                "name": camera.name,
                "camera_type": camera.camera_type,
                "configuration": getattr(camera, "configuration", None),
            }
            for camera in cameras
        ],
    }


def maintain_camera_health(now):
    cutoff = now - offline_after()
    total = 0
    while True:
        with transaction.atomic():
            cameras = list(
                Camera.objects.select_for_update()
                .filter(last_seen_at__lte=cutoff)
                .exclude(
                    health_status=Status.OFFLINE,
                )
                .order_by("pk")[:200]
            )
            if not cameras:
                break
            for camera in cameras:
                if remember_timeout(camera, now):
                    total += 1
            Camera.objects.bulk_update(cameras, ["health_status"])

    removed = 0
    retention_cutoff = now - timedelta(days=settings.CAMERA_HEALTH_RETENTION_DAYS)
    while True:
        old = list(
            CameraHealthEvent.objects.filter(occurred_at__lt=retention_cutoff)
            .order_by("occurred_at")
            .values_list("pk", flat=True)[:500]
        )
        if not old:
            break
        deleted, _ = CameraHealthEvent.objects.filter(pk__in=old).delete()
        removed += deleted
    return total, removed
