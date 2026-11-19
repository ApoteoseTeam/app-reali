import secrets

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.api.audit import audit
from apps.api.models import CameraCredential

from .authentication import digest
from .models import (
    CameraConfiguration,
    CameraHealthEvent,
    DeviceCredential,
    EdgeDevice,
    OperationalStatus,
)
from .observability import log_device_event


def camera_event(camera, event, previous, current, message, at):
    CameraHealthEvent.objects.create(
        camera=camera,
        event_type=event,
        previous_status=previous,
        new_status=current,
        message=message,
        occurred_at=at,
    )


def change_credential(device_id, actor, operation, expires_at=None):
    # Caller holds the organization lock for membership and school scope.
    with transaction.atomic():
        device = (
            EdgeDevice.objects.select_for_update(of=("self",), no_key=True)
            .select_related("school__organization")
            .get(pk=device_id)
        )
        now = timezone.now()
        active = device.credentials.filter(is_active=True).first()
        if operation == "revoke":
            if active is not None:
                revoke_credential(active, actor, device, now)
            return None
        if not device.is_active or not device.school.is_active:
            raise ValidationError(
                "Habilite o agente e a escola antes de emitir uma credencial."
            )
        if expires_at is not None and expires_at <= now:
            raise ValidationError(
                {"expires_at": "A validade precisa terminar no futuro."}
            )
        if operation == "issue" and active is not None:
            raise ValidationError("Já existe credencial ativa. Use a rotação.")
        if operation == "rotate":
            if active is None:
                raise ValidationError(
                    "Emita uma credencial inicial antes de fazer a rotação."
                )
            revoke_credential(active, actor, device, now)
        prefix = secrets.token_hex(12)
        token = f"{prefix}.{secrets.token_urlsafe(32)}"
        credential = DeviceCredential.objects.create(
            edge_device=device,
            token_prefix=prefix,
            token_hash=digest(token.encode()),
            expires_at=expires_at,
        )
        action = (
            "DEVICE_CREDENTIAL_ROTATED"
            if operation == "rotate"
            else "DEVICE_CREDENTIAL_ISSUED"
        )
        audit(
            action,
            credential,
            actor=actor,
            organization=device.school.organization,
            details={"device_id": str(device.pk), "school_id": str(device.school_id)},
        )
        if operation == "rotate":
            transaction.on_commit(lambda: log_device_event(action, device=device))
        return credential, token


def revoke_credential(credential, actor, device, at):
    credential.is_active = False
    credential.revoked_at = at
    credential.save(update_fields=["is_active", "revoked_at", "updated_at"])
    audit(
        "DEVICE_CREDENTIAL_REVOKED",
        credential,
        actor=actor,
        organization=device.school.organization,
        details={"device_id": str(device.pk), "school_id": str(device.school_id)},
    )
    transaction.on_commit(
        lambda: log_device_event("DEVICE_CREDENTIAL_REVOKED", device=device)
    )


def update_camera(camera, data, actor):
    school = data.get("school", camera.school)
    device = data.get("edge_device", camera.edge_device)
    new_type = data.get("camera_type", camera.camera_type)
    if (school.pk != camera.school_id or new_type != camera.camera_type) and (
        camera.edge_device_id
        or camera.student_counts.exists()
        or camera.plate_counts.exists()
        or camera.count_adjustments.exists()
        or camera.health_events.exists()
        or CameraConfiguration.objects.filter(camera=camera).exists()
    ):
        raise ValidationError(
            "Câmeras atribuídas ou com histórico mantêm sua escola e tipo originais."
        )
    ensure_same_school(school, device)

    at = timezone.now()
    was_active = camera.is_active
    old_agent_id = camera.edge_device_id
    previous_status = camera.health_status
    for field, value in data.items():
        setattr(camera, field, value)
    if old_agent_id != camera.edge_device_id:
        camera.last_seen_at = None
        camera.video_status = ""
        camera.detector_status = ""
        camera.processing_fps = None
        camera.pending_events = None
        camera.telemetry_reason = ""
        camera.health_status = OperationalStatus.UNKNOWN
        if camera.edge_device_id:
            CameraCredential.objects.filter(
                camera=camera, revoked_at__isnull=True
            ).update(revoked_at=at, updated_at=at)
        camera_event(
            camera,
            "AGENT_CHANGED",
            previous_status,
            camera.health_status,
            "Agente responsável alterado.",
            at,
        )
        audit(
            "CAMERA_AGENT_CHANGED",
            camera,
            actor=actor,
            organization=school.organization,
            details={
                "school_id": str(school.pk),
                "device_id": str(camera.edge_device_id)
                if camera.edge_device_id
                else None,
            },
        )
    if was_active != camera.is_active:
        event = "CAMERA_ACTIVATED" if camera.is_active else "CAMERA_DEACTIVATED"
        camera_event(
            camera,
            event,
            camera.health_status,
            camera.health_status,
            "Habilitação administrativa alterada.",
            at,
        )
        audit(
            event,
            camera,
            actor=actor,
            organization=school.organization,
            details={"school_id": str(school.pk)},
        )
    camera.save()
    return camera


def ensure_same_school(school, device):
    if device is not None and device.school_id != school.pk:
        raise ValidationError(
            {"edge_device": "O agente e a câmera devem pertencer à mesma escola."}
        )


def save_configuration(camera, parameters, actor):
    # The camera row is locked by the caller, including for the first version.
    config = CameraConfiguration.objects.filter(camera=camera).first()
    if config is None:
        config = CameraConfiguration.objects.create(
            camera=camera, parameters=parameters
        )
    elif config.parameters == parameters:
        return config
    else:
        config.parameters = parameters
        config.version += 1
        config.save(update_fields=["parameters", "version", "updated_at"])
    audit(
        "CAMERA_CONFIGURATION_CHANGED",
        camera,
        actor=actor,
        organization=camera.school.organization,
        details={"school_id": str(camera.school_id), "version": config.version},
    )
    return config


def update_device(device, data, actor):
    was_active = device.is_active
    for field, value in data.items():
        setattr(device, field, value)
    device.save()
    if was_active != device.is_active:
        action = (
            "EDGE_DEVICE_ACTIVATED" if device.is_active else "EDGE_DEVICE_DEACTIVATED"
        )
        audit(
            action,
            device,
            actor=actor,
            organization=device.school.organization,
            details={"school_id": str(device.school_id)},
        )
        if not device.is_active:
            transaction.on_commit(lambda: log_device_event(action, device=device))
    return device
