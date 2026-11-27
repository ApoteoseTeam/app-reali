from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta
from decimal import Decimal
from threading import Barrier

import pytest
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection, connections
from django.utils import timezone
from rest_framework.test import APIClient

from apps.api.models import AuditLog
from apps.cameras.models import Camera, CameraHealthEvent, EdgeDevice
from apps.cameras.provisioning import change_credential
from apps.counting.models import DeviceIngestionEvent, PlateCount, StudentCount
from apps.institutions.models import Organization, School
from apps.users.models import Membership, SchoolAccess, User

from .forecasting import predict_plates
from .models import (
    AttendanceSnapshot,
    MealForecast,
    MealForecastPolicy,
    MealSchedule,
    MealService,
)

pytestmark = pytest.mark.django_db
BASE = "/api/v1/"
MEALS = BASE + "meal-services/"
SCHEDULES = BASE + "meal-schedules/"
POLICIES = BASE + "meal-forecast-policies/"


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


@pytest.fixture
def site(monkeypatch):
    at = timezone.make_aware(datetime.combine(timezone.localdate(), time(9, 0)))
    monkeypatch.setattr(timezone, "now", lambda: at)
    org = Organization.objects.create(name="Rede")
    school = School.objects.create(name="Escola", code="A", organization=org)
    branch = School.objects.create(name="Outra unidade", code="B", organization=org)
    foreign_org = Organization.objects.create(name="Outra rede")
    foreign = School.objects.create(name="Externa", code="X", organization=foreign_org)
    director = User.objects.create(email="director@example.com")
    cook = User.objects.create(email="cook@example.com")
    Membership.objects.create(
        user=director, organization=org, role="MANAGER", all_schools_access=True
    )
    local_access = Membership.objects.create(user=cook, organization=org, role="COOK")
    SchoolAccess.objects.create(membership=local_access, school=school)
    device = EdgeDevice.objects.create(
        school=school, name="Agente", last_seen_at=at - timedelta(seconds=15)
    )
    camera_options = {
        "school": school,
        "edge_device": device,
        "last_seen_at": at - timedelta(seconds=15),
        "video_status": "STREAMING",
        "detector_status": "RUNNING",
        "processing_fps": 25,
        "pending_events": 0,
    }
    entrance = Camera.objects.create(
        name="Portaria", camera_type="ENTRANCE", **camera_options
    )
    cafeteria = Camera.objects.create(
        name="Cantina", camera_type="CAFETERIA", **camera_options
    )
    return org, school, branch, foreign, director, cook, device, entrance, cafeteria, at


def human(user, org):
    client = APIClient()
    client.force_authenticate(user)
    client.credentials(HTTP_X_ORGANIZATION_ID=str(org.pk))
    return client


def service(school, at, **overrides):
    defaults = {
        "school": school,
        "date": timezone.localdate(at),
        "meal_type": "LUNCH",
        "scheduled_time": time(11, 30),
        "entry_window_start": time(7),
    }
    return MealService.objects.create(**(defaults | overrides))


def entry(camera, at, quantity, event_id):
    return StudentCount.objects.create(
        camera=camera, recorded_at=at, quantity=quantity, external_event_id=event_id
    )


def device_token(device, actor):
    _, token = change_credential(device.pk, actor, "issue")
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Device {token}")
    return client


def test_meal_management_slots_and_filters(site):
    org, school, branch, foreign, director, cook, *_rest, at = site
    client = human(director, org)
    body = {
        "school": str(school.pk),
        "date": timezone.localdate(at).isoformat(),
        "meal_type": "LUNCH",
        "scheduled_time": "11:30",
        "scheduled_end_time": "12:30",
        "entry_window_start": "07:00",
    }
    created = client.post(MEALS, body, format="json")
    assert created.status_code == 201, created.data
    assert created.json()["created_by"] == director.pk
    assert (
        client.post(MEALS, body, format="json").json()["code"] == "MEAL_SLOT_CONFLICT"
    )
    overlapping = client.post(
        MEALS,
        {**body, "scheduled_time": "12:00", "scheduled_end_time": "13:00"},
        format="json",
    )
    assert overlapping.status_code == 409
    adjacent = client.post(
        MEALS,
        {**body, "scheduled_time": "12:30", "scheduled_end_time": "13:30"},
        format="json",
    )
    assert adjacent.status_code == 201
    assert (
        client.post(
            MEALS, {**body, "school": str(foreign.pk)}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(
            MEALS, {**body, "scheduled_end_time": "11:00"}, format="json"
        ).status_code
        == 400
    )
    assert human(cook, org).post(
        MEALS, {**body, "school": str(branch.pk)}, format="json"
    ).status_code in {400, 403}
    assert (
        client.get(
            MEALS,
            {
                "school": str(school.pk),
                "status": "PLANNED",
                "meal_type": "LUNCH",
                "date": body["date"],
            },
        ).json()["count"]
        == 2
    )
    edited = client.patch(
        MEALS + created.json()["id"] + "/", {"history_excluded": True}, format="json"
    )
    assert edited.status_code == 200 and edited.json()["history_excluded"]
    assert AuditLog.objects.filter(action="MEAL_SERVICE_CREATED").count() == 2


def test_schedules_generate_stable_service_and_respect_exceptions(site):
    org, school, _, _, director, _, *_rest, at = site
    client = human(director, org)
    day = timezone.localdate(at)
    body = {
        "school": str(school.pk),
        "meal_type": "LUNCH",
        "name": "Turno 1",
        "start_time": "11:30",
        "end_time": "12:30",
        "entry_window_start": "07:00",
        "weekdays": [day.isoweekday()],
        "excluded_dates": [(day + timedelta(days=7)).isoformat()],
    }
    created = client.post(SCHEDULES, body, format="json")
    assert created.status_code == 201, created.data
    path = SCHEDULES + created.json()["id"] + "/"
    assert (
        client.post(
            SCHEDULES,
            {**body, "weekdays": [day.isoweekday(), day.isoweekday()]},
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            SCHEDULES,
            {**body, "start_time": "12:00", "end_time": "13:00"},
            format="json",
        ).json()["code"]
        == "SCHEDULE_OVERLAP"
    )
    assert (
        client.post(
            path + "generate/",
            {"date": (day + timedelta(days=7)).isoformat()},
            format="json",
        ).json()["code"]
        == "SCHEDULE_NOT_APPLICABLE"
    )
    generated = client.post(
        path + "generate/", {"date": day.isoformat()}, format="json"
    )
    assert generated.status_code == 201, generated.data
    assert client.patch(path, {"start_time": "11:45"}, format="json").status_code == 200
    repeated = client.post(path + "generate/", {"date": day.isoformat()}, format="json")
    assert (
        repeated.status_code == 200 and repeated.json()["id"] == generated.json()["id"]
    )
    assert (
        repeated.json()["scheduled_time"] == "11:30:00"
        and repeated.json()["entry_window_start"] == "07:00:00"
    )
    assert MealSchedule.objects.count() == MealService.objects.count() == 1
    assert AuditLog.objects.filter(action="MEAL_SCHEDULE_CHANGED").count() == 1


def test_snapshot_window_adjustments_scope_and_replay(site, monkeypatch):
    org, school, branch, _, director, cook, _, entrance, _, at = site
    meal = service(school, at)
    outside = Camera.objects.create(school=branch, name="Outra", camera_type="ENTRANCE")
    entry(entrance, at - timedelta(hours=3), 100, "before-window")
    included = entry(entrance, at - timedelta(minutes=15), 12, "included")
    entry(entrance, at + timedelta(minutes=1), 500, "after-cutoff")
    entry(outside, at - timedelta(minutes=3), 200, "other-school")
    future_received = entry(entrance, at - timedelta(minutes=4), 300, "future-receipt")
    DeviceIngestionEvent.objects.create(
        camera=entrance,
        event_id="future-receipt",
        event_type="STUDENT_ENTRY",
        payload_hash="0" * 64,
        recorded_at=future_received.recorded_at,
        received_at=at + timedelta(minutes=1),
        student_count=future_received,
    )
    admin = human(director, org)
    adjusted = admin.post(
        BASE + "count-adjustments/",
        {
            "event_type": "STUDENT_ENTRY",
            "count_id": str(included.pk),
            "delta": -2,
            "reason": "Conferência",
        },
        format="json",
    )
    assert adjusted.status_code == 201
    policy = admin.post(
        POLICIES,
        {"school": str(school.pk), "meal_type": "LUNCH", "initial_rate": "1.250"},
        format="json",
    )
    assert policy.status_code == 201, policy.data
    assert (
        admin.post(
            POLICIES,
            {"school": str(school.pk), "meal_type": "LUNCH", "initial_rate": "1.250"},
            format="json",
        ).status_code
        == 409
    )
    assert (
        admin.patch(
            POLICIES + policy.json()["id"] + "/", {"initial_rate": "6"}, format="json"
        ).status_code
        == 400
    )

    cook_client = human(cook, org)
    assert (
        cook_client.post(
            MEALS + f"{meal.pk}/start/",
            {"estimated_plates_per_entry": "1.0"},
            format="json",
        ).status_code
        == 403
    )
    response = cook_client.post(MEALS + f"{meal.pk}/start/", {}, format="json")
    assert response.status_code == 200, response.data
    payload = response.json()
    snapshot, forecast = payload["attendance_snapshot"], payload["forecast"]
    assert payload["id"] == payload["meal_service_id"] == str(meal.pk)
    assert (
        snapshot["total_student_entries"] == 10
        and snapshot["metadata"]["adjustment_entries"] == -2
    )
    assert snapshot["data_quality_status"] == "COMPLETE"
    assert snapshot["cutoff_at"] == payload["preparation_started_at"]
    assert "cameras" not in snapshot["metadata"]
    assert forecast["predicted_plates"] == forecast["forecast_plates"] == 13
    assert forecast["conversion_rate"] == "1.250"
    assert (
        forecast["method"] == "CONFIGURED_RATE"
        and forecast["confidence_status"] == "PRELIMINARY"
    )
    assert payload["preparation_started_by"] == cook.pk

    monkeypatch.setattr(timezone, "now", lambda: at + timedelta(minutes=2))
    entry(entrance, at - timedelta(minutes=10), 40, "late")
    replay = cook_client.post(MEALS + f"{meal.pk}/start/", {}, format="json")
    assert (
        replay.status_code == 200 and replay.json()["attendance_snapshot"] == snapshot
    )
    assert replay.json()["forecast"] == forecast
    stored = AttendanceSnapshot.objects.get(meal_service=meal)
    stored.total_student_entries = 999
    with pytest.raises(ValidationError):
        stored.save()
    with pytest.raises(ValidationError):
        meal.forecast.save()
    assert (
        cook_client.get(MEALS + f"{meal.pk}/attendance-snapshot/").json()["id"]
        == snapshot["id"]
    )
    assert (
        cook_client.get(
            BASE + "meal-forecasts/", {"school": str(school.pk), "status": "PREPARING"}
        ).json()["count"]
        == 1
    )
    assert AuditLog.objects.filter(action="MEAL_PREPARATION_STARTED").count() == 1


def historical(school, cafeteria, now, days, entries, served, **overrides):
    observed = now - timedelta(days=days)
    start = observed + timedelta(hours=3)
    finish = start + timedelta(minutes=45)
    meal = service(
        school,
        observed,
        **(
            {
                "status": "FINISHED",
                "serving_started_at": start,
                "finished_at": finish,
                "serving_data_quality": "COMPLETE",
            }
            | overrides
        ),
    )
    AttendanceSnapshot.objects.create(
        meal_service=meal,
        reference_time=observed,
        window_start_at=observed - timedelta(hours=2),
        window_end_at=observed,
        total_student_entries=entries,
        data_quality_status="COMPLETE",
    )
    row = PlateCount.objects.create(
        camera=cafeteria,
        meal_service=meal,
        recorded_at=start + timedelta(minutes=5),
        quantity=served,
        external_event_id=f"plates-{meal.pk}",
    )
    return meal, row


def test_historical_forecast_uses_comparable_available_samples(site):
    org, school, branch, _, director, cook, _, entrance, cafeteria, at = site
    current = service(school, at)
    entry(entrance, at - timedelta(minutes=10), 10, "today")
    samples = [
        historical(school, cafeteria, at, index, entries, served)
        for index, (entries, served) in enumerate(
            ((100, 110), (200, 230), (100, 100)),
            start=1,
        )
    ]
    historical(school, cafeteria, at, 4, 100, 330, scheduled_time=time(12))
    historical(school, cafeteria, at, 5, 100, 330, entry_window_start=time(8))
    historical(school, cafeteria, at, 6, 100, 330, serving_data_quality="PARTIAL")
    historical(school, cafeteria, at, 7, 100, 330, history_excluded=True)
    candidate, candidate_plate = historical(school, cafeteria, at, 8, 100, 330)
    AttendanceSnapshot.objects.filter(meal_service=candidate).update(
        created_at=at + timedelta(minutes=5)
    )
    assert candidate_plate.quantity == 330
    historical(school, cafeteria, at, -1, 100, 330)
    elsewhere = Camera.objects.create(
        school=branch, name="Cantina externa", camera_type="CAFETERIA"
    )
    historical(branch, elsewhere, at, 1, 100, 330)
    original_meal, original_plate = samples[0]
    unavailable = PlateCount.objects.create(
        camera=cafeteria,
        meal_service=original_meal,
        recorded_at=original_plate.recorded_at,
        quantity=300,
        external_event_id="not-yet-available",
    )
    DeviceIngestionEvent.objects.create(
        camera=cafeteria,
        event_id="not-yet-available",
        event_type="PLATE_SERVED",
        payload_hash="0" * 64,
        recorded_at=unavailable.recorded_at,
        received_at=at + timedelta(seconds=1),
        plate_count=unavailable,
    )
    admin = human(director, org)
    corrected = admin.post(
        BASE + "count-adjustments/",
        {
            "event_type": "PLATE_SERVED",
            "count_id": str(original_plate.pk),
            "delta": 40,
            "reason": "Conferência do histórico",
        },
        format="json",
    )
    assert corrected.status_code == 201
    response = admin.post(MEALS + f"{current.pk}/start/", {}, format="json")
    assert response.status_code == 200, response.data
    forecast = response.json()["forecast"]
    assert (
        forecast["method"] == "HISTORICAL_RATE"
        and forecast["conversion_rate"] == "1.200"
    )
    assert (
        forecast["predicted_plates"] == 12
        and forecast["confidence_status"] == "SUFFICIENT"
    )
    assert forecast["algorithm_version"] == "reali-meal-v1"
    assert {row["meal_service_id"] for row in forecast["parameters"]["samples"]} == {
        str(pair[0].pk) for pair in samples
    }
    assert (
        predict_plates(
            forecast["parameters"]["entries"], Decimal(forecast["conversion_rate"])
        )
        == forecast["predicted_plates"]
    )
    limited = human(cook, org).get(MEALS + f"{current.pk}/forecast/").json()
    assert (
        "samples" not in limited["parameters"]
        and limited["parameters"]["sample_count"] == 3
    )


def test_quality_and_fallback_choices(site):
    org, school, _, _, director, _, device, entrance, _, at = site
    client = human(director, org)

    def start(meal):
        return client.post(MEALS + f"{meal.pk}/start/", {}, format="json").json()

    no_rate = start(service(school, at))
    assert no_rate["attendance_snapshot"]["data_quality_status"] == "COMPLETE"
    assert no_rate["forecast"]["predicted_plates"] is None
    assert (
        no_rate["forecast"]["parameters"]["reason"]
        == "INSUFFICIENT_HISTORY_AND_NO_INITIAL_RATE"
    )
    MealForecastPolicy.objects.create(
        school=school, meal_type="LUNCH", initial_rate=Decimal("1.200")
    )
    zero = start(service(school, at, scheduled_time=time(12)))
    assert zero["forecast"]["predicted_plates"] == 0
    offline = at - timedelta(minutes=5)
    EdgeDevice.objects.filter(pk=device.pk).update(last_seen_at=offline)
    Camera.objects.filter(pk=entrance.pk).update(last_seen_at=offline)
    stale = start(service(school, at, scheduled_time=time(12, 30)))
    assert stale["attendance_snapshot"]["data_quality_status"] == "STALE"
    assert stale["forecast"]["predicted_plates"] is None

    entry(entrance, at - timedelta(minutes=4), 5, "known")
    EdgeDevice.objects.filter(pk=device.pk).update(
        last_seen_at=at - timedelta(seconds=15)
    )
    Camera.objects.filter(pk=entrance.pk).update(
        last_seen_at=at - timedelta(seconds=15)
    )
    CameraHealthEvent.objects.create(
        camera=entrance,
        event_type="timeout",
        previous_status="ONLINE",
        new_status="OFFLINE",
        message="Evento de teste",
        occurred_at=at - timedelta(minutes=3),
    )
    partial = start(service(school, at, scheduled_time=time(13)))
    assert partial["attendance_snapshot"]["data_quality_status"] == "PARTIAL"
    assert partial["forecast"]["predicted_plates"] == 6
    assert partial["forecast"]["confidence_status"] == "PRELIMINARY"
    no_window = start(
        service(school, at, scheduled_time=time(14), entry_window_start=time(10))
    )
    assert no_window["attendance_snapshot"]["data_quality_status"] == "UNAVAILABLE"
    assert no_window["forecast"]["predicted_plates"] is None
    assert predict_plates(420, Decimal("0.930")) == 391


def test_service_transitions_plate_ingestion_and_cancellation(site, monkeypatch):
    org, school, _, _, director, cook, device, entrance, cafeteria, at = site
    meal = service(school, at)
    client = human(cook, org)
    admin = human(director, org)
    path = MEALS + f"{meal.pk}/"
    assert client.post(path + "start-serving/").json()["code"] == "INVALID_TRANSITION"
    assert client.post(path + "finish/").status_code == 409
    entry(entrance, at - timedelta(minutes=4), 5, "base")
    begin = admin.post(
        path + "start/", {"estimated_plates_per_entry": "1.100"}, format="json"
    )
    assert begin.json()["forecast"]["method"] == "OVERRIDE_RATE"
    assert client.post(path + "start-serving/").json()["serving_started_by"] == cook.pk
    assert client.post(path + "start-serving/").status_code == 409
    token = device_token(device, director)
    event = {
        "event_id": "plates",
        "camera_id": str(cafeteria.pk),
        "event_type": "PLATE_SERVED",
        "recorded_at": at.isoformat(),
        "quantity": 6,
        "meal_service_id": str(meal.pk),
    }
    assert token.post(BASE + "device/counts/", event, format="json").status_code == 201
    assert (
        admin.post(path + "cancel/", {"reason": "Mudança"}, format="json").status_code
        == 409
    )

    updated = at + timedelta(seconds=30)
    monkeypatch.setattr(timezone, "now", lambda: updated)
    Camera.objects.filter(pk=cafeteria.pk).update(
        last_seen_at=updated - timedelta(seconds=5)
    )
    EdgeDevice.objects.filter(pk=device.pk).update(
        last_seen_at=updated - timedelta(seconds=5)
    )
    finished = client.post(path + "finish/").json()
    assert finished["status"] == "FINISHED" and finished["finished_by"] == cook.pk
    assert finished["serving_data_quality"] == "COMPLETE"
    assert client.post(path + "finish/").status_code == 409
    assert client.post(path + "start/", {}, format="json").status_code == 409
    assert (
        token.post(
            BASE + "device/counts/", {**event, "event_id": "late"}, format="json"
        ).status_code
        == 201
    )
    assert PlateCount.objects.filter(meal_service=meal).count() == 2
    assert (
        client.get(path + "forecast/").json()["forecast_plates"]
        == begin.json()["forecast"]["forecast_plates"]
    )

    cancelled = service(school, at, scheduled_time=time(12, 30))
    cancel_path = MEALS + f"{cancelled.pk}/cancel/"
    assert (
        client.post(cancel_path, {"reason": "Exceção"}, format="json").status_code
        == 403
    )
    assert admin.post(cancel_path, {}, format="json").status_code == 400
    assert (
        admin.post(cancel_path, {"reason": "Exceção"}, format="json").json()["status"]
        == "CANCELLED"
    )
    assert (
        admin.post(MEALS + f"{cancelled.pk}/start/", {}, format="json").status_code
        == 409
    )
    assert (
        AuditLog.objects.filter(
            action__in=["MEAL_SERVICE_FINISHED", "MEAL_SERVICE_CANCELLED"]
        ).count()
        == 2
    )


def test_tenant_boundaries_and_inactive_staff_or_school(site):
    org, school, branch, foreign, director, cook, *_rest, at = site
    foreign_meal = service(foreign, at)
    branch_meal = service(branch, at)
    local = service(school, at)
    cook_client = human(cook, org)
    assert (
        cook_client.post(
            MEALS + f"{branch_meal.pk}/start/", {}, format="json"
        ).status_code
        == 404
    )
    assert (
        human(director, org).get(MEALS + f"{foreign_meal.pk}/forecast/").status_code
        == 404
    )
    assert human(director, foreign.organization).get(MEALS).status_code == 403
    Membership.objects.filter(user=cook).update(is_active=False)
    assert (
        cook_client.post(MEALS + f"{local.pk}/start/", {}, format="json").status_code
        == 403
    )
    School.objects.filter(pk=school.pk).update(is_active=False)
    denied = human(director, org).post(MEALS + f"{local.pk}/start/", {}, format="json")
    assert denied.status_code == 403 and denied.json()["code"] == "SCHOOL_UNAVAILABLE"
    assert not AttendanceSnapshot.objects.exists()


def test_failed_prediction_rolls_back_snapshot_state_and_audit(site, monkeypatch):
    org, school, _, _, director, _, *_rest, at = site
    meal = service(school, at)
    client = human(director, org)
    client.raise_request_exception = False

    def fail(*args, **kwargs):
        raise RuntimeError("fixture forecast failure")

    monkeypatch.setattr("apps.meals.services.create_forecast", fail)
    response = client.post(MEALS + f"{meal.pk}/start/", {}, format="json")
    assert response.status_code == 500
    meal.refresh_from_db()
    assert meal.status == "PLANNED" and meal.preparation_started_at is None
    assert not AttendanceSnapshot.objects.exists() and not MealForecast.objects.exists()
    assert not AuditLog.objects.filter(action="MEAL_PREPARATION_STARTED").exists()


@pytest.mark.django_db(transaction=True)
def test_simultaneous_preparation_is_idempotent(site):
    if connection.vendor != "postgresql":
        pytest.skip("Teste de locks executado em PostgreSQL.")
    org, school, _, _, _, cook, *_rest, at = site
    meal = service(school, at)
    gate = Barrier(2)

    def send():
        close_old_connections()
        try:
            gate.wait(timeout=10)
            result = human(cook, org).post(
                MEALS + f"{meal.pk}/start/", {}, format="json"
            )
            return result.status_code, result.json()["forecast"]["id"]
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: send(), range(2)))
    assert results[0] == results[1] and results[0][0] == 200
    assert AttendanceSnapshot.objects.count() == MealForecast.objects.count() == 1
    assert AuditLog.objects.filter(action="MEAL_PREPARATION_STARTED").count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_finish_preserves_single_transition(site):
    if connection.vendor != "postgresql":
        pytest.skip("Teste de locks executado em PostgreSQL.")
    org, school, _, _, _, cook, *_rest, at = site
    meal = service(school, at, status=MealService.Status.SERVING, serving_started_at=at)
    gate = Barrier(2)

    def finish(_):
        close_old_connections()
        try:
            gate.wait(timeout=10)
            return human(cook, org).post(MEALS + f"{meal.pk}/finish/").status_code
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(finish, range(2))) == [200, 409]
    meal.refresh_from_db()
    assert meal.status == MealService.Status.FINISHED
    assert (
        AuditLog.objects.filter(
            action="MEAL_SERVICE_FINISHED", object_id=str(meal.pk)
        ).count()
        == 1
    )


def test_empirical_outlier_is_excluded_before_fitting(site):
    org, school, _, _, director, _, _, entrance, cafeteria, at = site
    meal = service(school, at)
    entry(entrance, at - timedelta(minutes=10), 20, "target-entries")
    good = [
        historical(school, cafeteria, at, index, 100, served)[0]
        for index, served in enumerate([80, 90, 100, 90], start=1)
    ]
    historical(school, cafeteria, at, 5, 100, 450)
    payload = human(director, org).post(MEALS + f"{meal.pk}/start/", {}, format="json")
    assert payload.status_code == 200, payload.data
    forecast = payload.json()["forecast"]
    assert forecast["conversion_rate"] == "0.900" and forecast["predicted_plates"] == 18
    assert {item["meal_service_id"] for item in forecast["parameters"]["samples"]} == {
        str(row.pk) for row in good
    }
