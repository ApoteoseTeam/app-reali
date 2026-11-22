import hashlib
import json
from collections import defaultdict
from datetime import UTC, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from apps.analytics.dirty import mark_dirty

from apps.cameras.authentication import lock_authenticated_device, lock_legacy_camera
from apps.cameras.models import Camera
from apps.meals.models import MealService

from .models import (
    CameraCountActivity,
    CountKind,
    DeviceIngestionEvent,
    PlateCount,
    StudentCount,
)


class CountError(Exception):
    def __init__(self, status, code, message):
        self.status = status
        self.code = code
        self.message = message
        super().__init__(message)

    def result(self):
        return {"error": {"code": self.code, "message": self.message}}


def payload_hash(event):
    fields = [
        event["event_type"],
        event["quantity"],
        event["recorded_at"].astimezone(UTC).isoformat(timespec="microseconds"),
        str(event["meal_service_id"]) if event.get("meal_service_id") else None,
    ]
    return hashlib.sha256(
        json.dumps(fields, separators=(",", ":")).encode()
    ).hexdigest()


def camera_kind(camera):
    if camera.camera_type == Camera.CameraType.ENTRANCE:
        return CountKind.STUDENT_ENTRY
    return CountKind.PLATE_SERVED


def check_new_event(event, camera, meal, now, legacy):
    recorded = event["recorded_at"]
    future_seconds = 300 if legacy else settings.COUNT_MAX_FUTURE_SECONDS
    if recorded > now + timedelta(seconds=future_seconds):
        raise CountError(400, "EVENT_IN_FUTURE", "Horário da contagem no futuro.")
    if not legacy and recorded < now - timedelta(
        seconds=settings.COUNT_MAX_DELAY_SECONDS
    ):
        raise CountError(
            400, "EVENT_TOO_OLD", "Contagem fora da janela de recebimento."
        )
    if event["event_type"] != camera_kind(camera):
        raise CountError(
            400, "CAMERA_TYPE_MISMATCH", "O tipo do evento não corresponde à câmera."
        )
    if event["event_type"] == CountKind.STUDENT_ENTRY:
        if event.get("meal_service_id"):
            raise CountError(
                400,
                "UNEXPECTED_MEAL_SERVICE",
                "Entradas não recebem serviço de merenda.",
            )
        return
    if not event.get("meal_service_id"):
        raise CountError(400, "MEAL_SERVICE_REQUIRED", "Informe o serviço de merenda.")
    if not meal or meal.school_id != camera.school_id:
        raise CountError(
            404, "MEAL_SERVICE_NOT_FOUND", "Serviço não encontrado nesta escola."
        )
    if legacy:
        if meal.status != MealService.Status.SERVING:
            raise CountError(
                409, "MEAL_SERVICE_STATE", "O serviço não está em distribuição."
            )
        return
    if (
        meal.status not in {MealService.Status.SERVING, MealService.Status.FINISHED}
        or not meal.serving_started_at
        or (meal.status == MealService.Status.FINISHED and not meal.finished_at)
    ):
        raise CountError(
            409,
            "MEAL_SERVICE_STATE",
            "O serviço não tem uma janela válida de distribuição.",
        )
    if recorded < meal.serving_started_at or (
        meal.finished_at and recorded > meal.finished_at
    ):
        raise CountError(
            409,
            "OUTSIDE_SERVING_WINDOW",
            "Horário fora da janela de distribuição do serviço.",
        )


def result_for(entry, duplicate):
    return {
        "status": "already_processed" if duplicate else "created",
        "event_id": entry.event_id,
        "processed": True,
        "duplicate": duplicate,
        "id": str(entry.student_count_id or entry.plate_count_id),
    }


def process_events(cameras, events, received_at, *, legacy=False):
    if not events:
        return []
    ids = {event["event_id"] for event in events if event["camera_id"] in cameras}
    entries = {
        (entry.camera_id, entry.event_id): entry
        for entry in DeviceIngestionEvent.objects.filter(
            camera_id__in=cameras, event_id__in=ids
        )
    }
    meal_ids = {
        event["meal_service_id"]
        for event in events
        if event.get("meal_service_id")
        and (event["camera_id"], event["event_id"]) not in entries
        and event["camera_id"] in cameras
        and cameras[event["camera_id"]].is_active
    }
    schools = {camera.school_id for camera in cameras.values()}
    meals = {
        meal.pk: meal
        for meal in MealService.objects.select_for_update(no_key=True)
        .filter(pk__in=meal_ids, school_id__in=schools)
        .order_by("pk")
    }
    activities = {
        row.camera_id: row
        for row in CameraCountActivity.objects.filter(camera_id__in=cameras)
    }
    counts = defaultdict(list)
    new_entries = []
    results = []
    for event in events:
        camera = cameras.get(event["camera_id"])
        try:
            if camera is None:
                raise CountError(
                    404,
                    "CAMERA_NOT_FOUND",
                    "Câmera não encontrada no escopo do agente.",
                )
            stats = activities.setdefault(camera.pk, CameraCountActivity(camera=camera))
            if not camera.is_active:
                raise CountError(403, "CAMERA_DISABLED", "A câmera está desativada.")
            key = (camera.pk, event["event_id"])
            digest = payload_hash(event)
            entry = entries.get(key)
            duplicate = entry is not None
            if duplicate:
                if entry.payload_hash != digest:
                    raise CountError(
                        409,
                        "EVENT_CONFLICT",
                        "O identificador do evento já foi utilizado com dados diferentes.",
                    )
                stats.duplicates += 1
            else:
                meal = meals.get(event.get("meal_service_id"))
                check_new_event(event, camera, meal, received_at, legacy)
                model = (
                    StudentCount
                    if event["event_type"] == CountKind.STUDENT_ENTRY
                    else PlateCount
                )
                count = model(
                    camera=camera,
                    quantity=event["quantity"],
                    recorded_at=event["recorded_at"],
                    external_event_id=event["event_id"],
                    source=model.Source.AUTOMATIC,
                )
                reference = (
                    {"student_count": count}
                    if model is StudentCount
                    else {"plate_count": count}
                )
                if meal is not None:
                    count.meal_service = meal
                entry = DeviceIngestionEvent(
                    camera=camera,
                    event_id=event["event_id"],
                    event_type=event["event_type"],
                    payload_hash=digest,
                    recorded_at=event["recorded_at"],
                    received_at=received_at,
                    **reference,
                )
                counts[model].append(count)
                new_entries.append(entry)
                entries[key] = entry
                stats.processed += 1
                if not stats.last_received_at or received_at >= stats.last_received_at:
                    stats.last_received_at = received_at
                    stats.last_recorded_at = event["recorded_at"]
            results.append((200 if duplicate else 201, result_for(entry, duplicate)))
        except CountError as exc:
            if camera is not None:
                stats.rejected += 1
            results.append(
                (exc.status, {"event_id": event["event_id"], **exc.result()})
            )

    # All rows have application-level scope and type validation before these batched inserts.
    for model, rows in counts.items():
        model.objects.bulk_create(rows)
    DeviceIngestionEvent.objects.bulk_create(new_entries)
    created_activity = []
    updated_activity = []
    for activity in activities.values():
        if activity._state.adding:
            created_activity.append(activity)
        else:
            activity.updated_at = max(activity.updated_at, received_at)
            updated_activity.append(activity)
    CameraCountActivity.objects.bulk_create(created_activity)
    CameraCountActivity.objects.bulk_update(
        updated_activity,
        [
            "processed",
            "duplicates",
            "rejected",
            "last_received_at",
            "last_recorded_at",
            "updated_at",
        ],
    )
    keys = {
        (row.camera.school_id, timezone.localdate(row.recorded_at))
        for rows in counts.values()
        for row in rows
    }
    keys.update(
        (row.camera.school_id, row.meal_service.date) for row in counts[PlateCount]
    )
    mark_dirty(keys)
    return results


@transaction.atomic
def ingest_agent(credential, events, received_at):
    device, _ = lock_authenticated_device(credential)
    cameras = {
        camera.pk: camera
        for camera in Camera.objects.select_for_update(no_key=True)
        .filter(
            pk__in={event["camera_id"] for event in events},
            edge_device=device,
            school_id=device.school_id,
        )
        .order_by("pk")
    }
    return process_events(cameras, events, received_at)


@transaction.atomic
def ingest_legacy(credential, event, received_at):
    camera = lock_legacy_camera(credential)
    if "meal_service" in event:
        event["meal_service_id"] = event.pop("meal_service")
    event.update(camera_id=camera.pk, event_type=camera_kind(camera))
    return process_events({camera.pk: camera}, [event], received_at, legacy=True)[0]
