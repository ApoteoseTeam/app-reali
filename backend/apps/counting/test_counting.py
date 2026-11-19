from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

import pytest
from django.core.cache import cache
from django.db import OperationalError, close_old_connections, connection, connections
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.api.models import AuditLog, CameraCredential
from apps.cameras.models import Camera, DeviceCredential, EdgeDevice
from apps.cameras.provisioning import change_credential
from apps.institutions.models import Organization, School
from apps.meals.models import AttendanceSnapshot, MealForecast, MealService
from apps.users.models import Membership, SchoolAccess, User

from .models import (
    CameraCountActivity,
    CountAdjustment,
    DeviceIngestionEvent,
    PlateCount,
    StudentCount,
)

pytestmark = pytest.mark.django_db
BASE = "/api/v1/"
COUNTS = BASE + "device/counts/"
BATCH = COUNTS + "batch/"
ADJUST = BASE + "count-adjustments/"


@pytest.fixture(autouse=True)
def clear_rate_limits():
    cache.clear()


@pytest.fixture
def site():
    org = Organization.objects.create(name="Rede")
    school = School.objects.create(name="Escola A", code="A", organization=org)
    branch = School.objects.create(name="Escola B", code="B", organization=org)
    foreign = School.objects.create(
        name="Externa",
        code="X",
        organization=Organization.objects.create(name="Outra rede"),
    )
    director = User.objects.create(email="director@example.com", full_name="Direção")
    Membership.objects.create(
        user=director, organization=org, role="DIRECTOR", all_schools_access=True
    )
    device = EdgeDevice.objects.create(school=school, name="Agente")
    entrance = Camera.objects.create(
        school=school, edge_device=device, name="Portaria", camera_type="ENTRANCE"
    )
    cafeteria = Camera.objects.create(
        school=school, edge_device=device, name="Cantina", camera_type="CAFETERIA"
    )
    credential, token = change_credential(device.pk, director, "issue")
    at = timezone.now()
    meal = MealService.objects.create(
        school=school,
        date=timezone.localdate(at),
        meal_type="LUNCH",
        scheduled_time="12:00",
        status="SERVING",
        serving_started_at=at - timedelta(hours=3),
    )
    return (
        org,
        school,
        branch,
        foreign,
        director,
        device,
        entrance,
        cafeteria,
        credential,
        token,
        at,
        meal,
    )


def agent(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Device {token}")
    return client


def human(user, organization, *, jwt=False):
    client = APIClient()
    headers = {"HTTP_X_ORGANIZATION_ID": str(organization.pk)}
    if jwt:
        headers["HTTP_AUTHORIZATION"] = "Bearer " + str(AccessToken.for_user(user))
    else:
        client.force_authenticate(user)
    client.credentials(**headers)
    return client


def event(
    camera, at, event_id="event-1", quantity=4, *, kind="STUDENT_ENTRY", meal=None
):
    data = {
        "event_id": event_id,
        "camera_id": str(camera.pk),
        "event_type": kind,
        "quantity": quantity,
        "recorded_at": at.isoformat() if hasattr(at, "isoformat") else at,
    }
    if meal is not None:
        data["meal_service_id"] = str(meal.pk)
    return data


def send(token, payload):
    return agent(token).post(COUNTS, payload, format="json")


def test_authenticated_ingestion_idempotency_activity_and_timezone_canonicalization(
    site, caplog
):
    org, _, _, _, director, device, entrance, cafeteria, _, token, at, meal = site
    payload = event(entrance, at)
    first = send(token, payload)
    assert first.status_code == 201, first.data
    duplicate = send(
        token, {**payload, "recorded_at": timezone.localtime(at).isoformat()}
    )
    assert duplicate.status_code == 200
    assert duplicate.json() == {
        **first.json(),
        "status": "already_processed",
        "duplicate": True,
    }
    assert (
        send(token, {**payload, "quantity": 9}).json()["error"]["code"]
        == "EVENT_CONFLICT"
    )
    conflict = send(
        token,
        {**payload, "event_type": "PLATE_SERVED", "meal_service_id": str(meal.pk)},
    )
    assert conflict.status_code == 409
    plate = send(token, event(cafeteria, at, kind="PLATE_SERVED", meal=meal))
    assert plate.status_code == 201  # event_id belongs to the camera scope
    assert (
        StudentCount.objects.get().quantity == 4
        and PlateCount.objects.get().meal_service == meal
    )
    assert DeviceIngestionEvent.objects.count() == 2
    assert DeviceIngestionEvent.objects.get(camera=entrance).recorded_at == at
    activity = (
        human(director, org).get(BASE + f"cameras/{entrance.pk}/count-activity/").json()
    )
    assert (activity["processed"], activity["duplicates"], activity["rejected"]) == (
        1,
        1,
        2,
    )
    assert activity["last_delay_seconds"] >= 0
    assert activity["last_attempt_at"] >= activity["last_received_at"]
    device.refresh_from_db()
    entrance.refresh_from_db()
    assert device.last_seen_at is None and entrance.last_seen_at is None
    assert "EVENT_CONFLICT" in caplog.text and token not in caplog.text


@pytest.mark.parametrize(
    "bad",
    [
        {"quantity": 0},
        {"quantity": -1},
        {"quantity": 1.5},
        {"quantity": True},
        {"quantity": "2"},
        {"recorded_at": "2026-01-01T10:00:00"},
        {"recorded_at": "invalid"},
        {"event_type": "STUDENT_EXIT"},
    ],
)
def test_reject_invalid_payload(site, bad):
    *_, entrance, cafeteria, credential, token, at, meal = site
    assert send(token, {**event(entrance, at), **bad}).status_code == 400
    assert not DeviceIngestionEvent.objects.exists()


def test_authentication_and_camera_scope(site):
    (
        org,
        school,
        branch,
        foreign,
        director,
        device,
        entrance,
        cafeteria,
        credential,
        token,
        at,
        meal,
    ) = site
    payload = event(entrance, at)
    assert APIClient().post(COUNTS, payload, format="json").status_code == 401
    assert send("wrong-token", payload).status_code == 401
    assert (
        human(director, org, jwt=True).post(COUNTS, payload, format="json").status_code
        == 401
    )
    assert agent(token).get(BASE + "student-counts/").status_code == 401
    second_device = EdgeDevice.objects.create(school=school, name="Outro agente")
    for camera in (
        Camera.objects.create(
            school=school,
            edge_device=second_device,
            name="Outra",
            camera_type="ENTRANCE",
        ),
        Camera.objects.create(
            school=branch, name="Outra unidade", camera_type="ENTRANCE"
        ),
        Camera.objects.create(
            school=foreign, name="Outra organização", camera_type="ENTRANCE"
        ),
    ):
        assert send(token, event(camera, at)).status_code == 404
    entrance.is_active = False
    entrance.save(update_fields=["is_active"])
    assert send(token, payload).status_code == 403
    entrance.is_active = True
    entrance.save(update_fields=["is_active"])
    device.is_active = False
    device.save(update_fields=["is_active"])
    assert send(token, payload).status_code == 401
    device.is_active = True
    device.save(update_fields=["is_active"])
    DeviceCredential.objects.filter(pk=credential.pk).update(
        expires_at=at - timedelta(seconds=1)
    )
    assert send(token, payload).status_code == 401
    change_credential(device.pk, director, "revoke")
    assert send(token, payload).status_code == 401
    assert not StudentCount.objects.exists()


def test_meal_state_actual_window_delays_and_frozen_snapshot(site):
    org, school, branch, _, director, _, entrance, cafeteria, _, token, at, meal = site
    snapshot = AttendanceSnapshot.objects.create(
        meal_service=meal, reference_time=at, total_student_entries=10
    )
    MealForecast.objects.create(
        meal_service=meal, attendance_snapshot=snapshot, forecast_plates=9
    )
    other = MealService.objects.create(
        school=branch,
        date=meal.date,
        meal_type="LUNCH",
        scheduled_time="12:00",
        status="SERVING",
        serving_started_at=at - timedelta(hours=1),
    )
    assert (
        send(token, event(cafeteria, at)).json()["error"]["code"]
        == "CAMERA_TYPE_MISMATCH"
    )
    assert (
        send(token, event(entrance, at, kind="PLATE_SERVED", meal=meal)).status_code
        == 400
    )
    assert send(token, event(cafeteria, at, kind="PLATE_SERVED")).status_code == 400
    assert (
        send(token, event(cafeteria, at, kind="PLATE_SERVED", meal=other)).status_code
        == 404
    )
    assert (
        send(
            token,
            event(
                cafeteria,
                at,
                kind="PLATE_SERVED",
                meal=type("Missing", (), {"pk": uuid4()})(),
            ),
        ).status_code
        == 404
    )
    meal.status = "PREPARING"
    meal.save(update_fields=["status"])
    assert (
        send(token, event(cafeteria, at, kind="PLATE_SERVED", meal=meal)).status_code
        == 409
    )
    meal.status = "FINISHED"
    meal.finished_at = at - timedelta(minutes=10)
    meal.save(update_fields=["status", "finished_at"])
    for outside in (at, at - timedelta(hours=4)):
        assert (
            send(
                token, event(cafeteria, outside, kind="PLATE_SERVED", meal=meal)
            ).json()["error"]["code"]
            == "OUTSIDE_SERVING_WINDOW"
        )
    late_plate = event(
        cafeteria, at - timedelta(minutes=45), kind="PLATE_SERVED", meal=meal
    )
    assert send(token, late_plate).status_code == 201
    assert send(token, late_plate).status_code == 200

    assert (
        send(token, event(entrance, at - timedelta(days=3))).json()["error"]["code"]
        == "EVENT_TOO_OLD"
    )
    assert (
        send(token, event(entrance, at + timedelta(hours=1))).json()["error"]["code"]
        == "EVENT_IN_FUTURE"
    )
    assert (
        send(token, event(entrance, at - timedelta(minutes=2), "second")).status_code
        == 201
    )
    assert (
        send(token, event(entrance, at - timedelta(minutes=20), "first")).status_code
        == 201
    )
    snapshot.refresh_from_db()
    assert (
        snapshot.total_student_entries == 10 and snapshot.forecast.forecast_plates == 9
    )


def test_batch_partial_order_limits_rate_and_retries(site, settings):
    _, _, _, _, _, _, entrance, cafeteria, _, token, at, meal = site
    valid = event(entrance, at)
    plate = event(cafeteria, at, kind="PLATE_SERVED", meal=meal)
    payload = {"events": [valid, valid, {**valid, "quantity": 12}, None, plate]}
    client = agent(token)
    first = client.post(BATCH, payload, format="json")
    assert first.status_code == 200, first.data
    assert first.json()["status"] == "partial"
    assert [item["http_status"] for item in first.json()["results"]] == [
        201,
        200,
        409,
        400,
        201,
    ]
    retry = client.post(BATCH, payload, format="json")
    assert [item["http_status"] for item in retry.json()["results"]] == [
        200,
        200,
        409,
        400,
        200,
    ]
    assert StudentCount.objects.count() == PlateCount.objects.count() == 1
    settings.COUNT_BATCH_LIMIT = 2
    assert client.post(BATCH, payload, format="json").status_code == 400
    settings.COUNT_MAX_BODY_BYTES = 32
    assert client.post(COUNTS, valid, format="json").status_code == 413
    settings.COUNT_MAX_BODY_BYTES = 131072
    rate = dict(
        settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], **{"device-counts": "1/min"}
    )
    from .views import CountThrottle

    monkey_settings = dict(CountThrottle.THROTTLE_RATES)
    try:
        CountThrottle.THROTTLE_RATES = rate
        cache.clear()
        assert client.post(COUNTS, valid, format="json").status_code == 200
        assert client.post(BATCH, {"events": [valid]}, format="json").status_code == 429
    finally:
        CountThrottle.THROTTLE_RATES = monkey_settings


def test_failed_persistence_rolls_back_counts_and_ledger(site, monkeypatch):
    _, _, _, _, _, _, entrance, cafeteria, credential, token, at, meal = site

    def fail(*args, **kwargs):
        raise OperationalError("fixture: transient storage outage")

    with monkeypatch.context() as patch:
        patch.setattr(DeviceIngestionEvent.objects, "bulk_create", fail)
        result = agent(token).post(
            BATCH,
            {
                "events": [
                    event(entrance, at),
                    event(cafeteria, at, kind="PLATE_SERVED", meal=meal),
                ]
            },
            format="json",
        )
    assert result.status_code == 503 and "outage" not in result.content.decode()
    assert not StudentCount.objects.exists() and not PlateCount.objects.exists()
    assert (
        not DeviceIngestionEvent.objects.exists()
        and not CameraCountActivity.objects.exists()
    )
    credential.refresh_from_db()
    assert credential.last_used_at is None
    assert send(token, event(entrance, at)).status_code == 201


def test_queries_adjustments_reversal_audit_and_metrics(site):
    (
        org,
        school,
        branch,
        foreign,
        director,
        _,
        entrance,
        cafeteria,
        _,
        token,
        at,
        meal,
    ) = site
    original = send(token, event(entrance, at)).json()["id"]
    plate = send(
        token, event(cafeteria, at, quantity=8, kind="PLATE_SERVED", meal=meal)
    ).json()["id"]
    client = human(director, org)
    manager = User.objects.create(email="manager@example.com")
    member = Membership.objects.create(organization=org, user=manager, role="MANAGER")
    SchoolAccess.objects.create(membership=member, school=branch)
    outside = human(manager, org)
    adjustment = {
        "event_type": "STUDENT_ENTRY",
        "count_id": original,
        "delta": -2,
        "reason": "Revisão humana",
    }
    assert outside.post(ADJUST, adjustment, format="json").status_code == 404
    assert outside.get(BASE + "student-counts/").json()["count"] == 0
    assert (
        client.get(BASE + f"student-counts/?school={foreign.pk}").json()["count"] == 0
    )
    assert (
        client.post(ADJUST, {**adjustment, "reason": ""}, format="json").status_code
        == 400
    )
    assert (
        client.post(ADJUST, {**adjustment, "delta": -5}, format="json").status_code
        == 400
    )
    changed = client.post(ADJUST, adjustment, format="json")
    assert changed.status_code == 201, changed.data
    assert (
        client.post(
            ADJUST,
            {
                "event_type": "PLATE_SERVED",
                "count_id": plate,
                "delta": -1,
                "reason": "Revisão",
            },
            format="json",
        ).status_code
        == 201
    )

    filters = {
        "school": str(school.pk),
        "camera": str(entrance.pk),
        "start_at": at.isoformat(),
        "end_at": at.isoformat(),
    }
    rows = client.get(BASE + "student-counts/", filters).json()
    assert rows["count"] == 1 and rows["results"][0]["id"] == original
    assert rows["results"][0]["received_at"]
    summary = client.get(BASE + "student-counts/summary/", filters).json()
    assert (
        summary["automatic"],
        summary["adjustment"],
        summary["student_entries"],
    ) == (4, -2, 2)
    planned = MealService.objects.create(
        school=school,
        date=timezone.localdate(at),
        meal_type="SNACK",
        scheduled_time="15:00",
    )
    started = client.post(
        BASE + f"meal-services/{planned.pk}/start/", {}, format="json"
    )
    assert started.status_code == 200
    assert (
        AttendanceSnapshot.objects.get(meal_service=planned).total_student_entries == 2
    )
    plates = client.get(
        BASE + "plate-counts/summary/",
        {"meal_service": str(meal.pk), "date": timezone.localdate(at)},
    ).json()
    assert plates["served_plates"] == 7
    rebuilt = client.post(
        BASE + "analytics/rebuild/",
        {"school": str(school.pk), "date": timezone.localdate(at).isoformat()},
        format="json",
    )
    assert (
        rebuilt.json()["total_student_entries"] == 2
        and rebuilt.json()["total_served_plates"] == 7
    )

    supplement = client.post(
        ADJUST,
        {
            "event_type": "STUDENT_ENTRY",
            "camera_id": str(entrance.pk),
            "recorded_at": at.isoformat(),
            "delta": 3,
            "reason": "Passagem ausente",
        },
        format="json",
    )
    assert supplement.status_code == 201
    reversal_url = ADJUST + supplement.json()["id"] + "/reverse/"
    assert (
        client.post(
            reversal_url, {"reason": "Duplicação da conferência"}, format="json"
        ).status_code
        == 201
    )
    assert (
        client.post(
            reversal_url, {"reason": "Tentativa repetida"}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(
            ADJUST + changed.json()["id"] + "/reverse/",
            {"reason": "Revisão concluída"},
            format="json",
        ).status_code
        == 201
    )
    assert StudentCount.objects.get(pk=original).quantity == 4
    assert len(client.get(ADJUST).json()["results"]) == 5
    assert AuditLog.objects.filter(action="COUNT_ADJUSTMENT_REVERSED").count() == 2

    teacher = User.objects.create(email="teacher@example.com")
    Membership.objects.create(
        organization=org, user=teacher, role="TEACHER", all_schools_access=True
    )
    assert human(teacher, org).get(BASE + "student-counts/summary/").status_code == 403
    assert (
        human(teacher, org).post(ADJUST, adjustment, format="json").status_code == 403
    )


def test_legacy_counts_and_replay_after_agent_assignment(site):
    org, school, _, _, director, device, _, _, _, token, at, _ = site
    camera = Camera.objects.create(school=school, name="Legada", camera_type="ENTRANCE")
    raw, hashed = CameraCredential.generate_secret()
    CameraCredential.objects.create(camera=camera, secret_hash=hashed)
    legacy = APIClient()
    legacy.credentials(HTTP_X_CAMERA_ID=str(camera.pk), HTTP_X_CAMERA_KEY=raw)
    payload = {"event_id": "legacy", "quantity": 3, "recorded_at": at.isoformat()}
    original = legacy.post(COUNTS, payload, format="json")
    assert original.status_code == 201 and set(original.json()) == {"id", "created"}
    assert legacy.post(COUNTS, payload, format="json").json()["created"] is False
    legacy_conflict = legacy.post(COUNTS, {**payload, "quantity": 5}, format="json")
    assert legacy_conflict.status_code == 400 and "event_id" in legacy_conflict.json()
    assert (
        human(director, org)
        .patch(
            BASE + f"cameras/{camera.pk}/",
            {"edge_device": str(device.pk)},
            format="json",
        )
        .status_code
        == 200
    )
    assert legacy.post(COUNTS, payload, format="json").status_code == 403
    replay = send(
        token, {**payload, "camera_id": str(camera.pk), "event_type": "STUDENT_ENTRY"}
    )
    assert replay.status_code == 200 and replay.json()["id"] == original.json()["id"]


@pytest.mark.django_db(transaction=True)
def test_parallel_delivery_and_adjustments_keep_invariants(site):
    if connection.vendor != "postgresql":
        pytest.skip("O teste de locks requer PostgreSQL.")
    org, _, _, _, director, _, entrance, _, _, token, at, _ = site

    def run_pair(operation):
        start = Barrier(2)

        def worker():
            close_old_connections()
            try:
                start.wait(timeout=12)
                return operation()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(lambda _: worker(), range(2)))

    results = run_pair(lambda: send(token, event(entrance, at)))
    assert sorted(response.status_code for response in results) == [200, 201]
    assert StudentCount.objects.count() == DeviceIngestionEvent.objects.count() == 1
    row = StudentCount.objects.get()
    results = run_pair(
        lambda: human(director, org).post(
            ADJUST,
            {
                "event_type": "STUDENT_ENTRY",
                "count_id": str(row.pk),
                "delta": -3,
                "reason": "Revisada",
            },
            format="json",
        )
    )
    assert sorted(response.status_code for response in results) == [201, 400]
    assert CountAdjustment.objects.count() == 1
