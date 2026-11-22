import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from smtplib import SMTPException
from threading import Barrier
from uuid import uuid4
from urllib.parse import urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from django.core.cache import cache
from django.db import DatabaseError, connection, connections
from django.utils import timezone
from rest_framework.test import APIClient

from apps.analytics.dirty import mark_dirty
from apps.analytics.models import DailyMetrics, PendingDailyMetrics
from apps.analytics.services import rebuild_daily_metrics
from apps.api.audit import audit
from apps.api.invitation_service import invite_employee
from apps.api.models import AuditLog, UserInvitation
from apps.api.session_auth import LoginSerializer
from apps.cameras.models import (
    Camera,
    CameraHealthEvent,
    DetectorStatus,
    OperationalStatus,
    VideoStatus,
)
from apps.counting.models import CountAdjustment, StudentCount
from apps.institutions.models import Organization, School
from apps.meals.models import MealService
from apps.meals.services import (
    cancel_service,
    finish_service,
    start_preparation,
    start_serving,
)
from apps.users.models import Membership, SchoolAccess, User

from .alerts import check_camera, check_due, check_invite, check_meal
from .delivery import claim, process_due
from .events import forecast_difference
from .models import (
    Kind,
    Notification,
    NotificationDelivery,
    NotificationPreference,
    Priority,
    PushDevice,
)
from .services import publish

BASE = "/api/v1/"
INBOX = BASE + "notifications/"
DEVICES = INBOX + "push-devices/"
PREFERENCES = INBOX + "preferences/"
ADJUSTMENTS = BASE + "count-adjustments/"
AUDIT = BASE + "audit-logs/"
Channel = NotificationDelivery.Channel
Status = NotificationDelivery.Status


def person(org, email, *, role=Membership.Role.DIRECTOR, schools=None):
    user = User.objects.create_user(email)
    member = Membership.objects.create(
        user=user, organization=org, role=role, all_schools_access=schools is None
    )
    for school in schools or []:
        SchoolAccess.objects.create(membership=member, school=school)
    return member


@pytest.fixture
def org_data(db, settings):
    cache.clear()
    settings.NOTIFICATION_PUSH_KEYS = [Fernet.generate_key().decode()]
    org = Organization.objects.create(name="Rede do teste")
    school = School.objects.create(name="Central", organization=org, code="001")
    other_school = School.objects.create(name="Anexo", organization=org, code="002")
    director = person(org, "director@reali.test")
    return org, school, other_school, director


def client(member, refresh=None):
    refresh = refresh or LoginSerializer.get_token(member.user)
    api = APIClient()
    api.credentials(
        HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}",
        HTTP_X_ORGANIZATION_ID=str(member.organization_id),
    )
    return api


def post_notice(org, school, *, key="event-1", kind=Kind.CAMERA_OFFLINE, data=None):
    publish(
        kind,
        organization_id=org.pk,
        school_id=school.pk,
        key=key,
        title="Atenção",
        message="Confira o estado registrado.",
        data=data,
    )


def token_body(name="device", *, installation=None, secret=None, platform="ANDROID"):
    return {
        "installation": str(installation or uuid4()),
        "installation_secret": secret or "1" * 64,
        "push_token": f"ExpoPushToken[phase-nine-{name}]",
        "platform": platform,
    }


@pytest.mark.django_db
def test_inbox_pagination_read_archive_and_tenant_boundaries(org_data):
    org, school, other, director = org_data
    colleague = person(org, "colleague@reali.test")
    external_org = Organization.objects.create(name="Outra rede")
    external = person(external_org, "external@reali.test")
    api = client(director)
    for index in range(51):
        post_notice(org, school, key=f"camera:{index}")
    post_notice(org, other, key="another-school")
    params = {"school_id": school.pk}
    response = api.get(INBOX, params)
    assert response.status_code == 200, response.json()
    result = response.json()
    assert result["count"] == 51 and len(result["results"]) == 50 and result["next"]
    first = result["results"][0]
    assert first["school_name"] == school.name and first["read_at"] is None
    path = f"{INBOX}{first['id']}/"
    assert client(colleague).get(path).status_code == 404
    assert client(external).get(path).status_code == 404
    assert api.get(path, {"school_id": other.pk}).status_code == 404
    assert api.get(f"{INBOX}unread-count/", params).json() == {"unread_count": 51}
    read = api.post(path + "read/").json()
    assert api.post(path + "read/").json()["read_at"] == read["read_at"]
    assert api.post(path + "archive/").status_code == 200
    assert api.get(INBOX, {**params, "archived": "true"}).json()["count"] == 1
    assert (
        api.get(INBOX, {**params, "unread": "true", "type": "CAMERA_OFFLINE"}).json()[
            "count"
        ]
        == 50
    )
    assert api.post(f"{INBOX}read-all/?school_id={school.pk}").json() == {"updated": 50}
    assert api.post(f"{INBOX}read-all/?school_id={school.pk}").json() == {"updated": 0}
    assert api.get(f"{INBOX}unread-count/", {"school_id": other.pk}).json() == {
        "unread_count": 1
    }
    assert api.get(INBOX, {"type": "UNKNOWN"}).status_code == 400
    assert api.get(INBOX, {"archived": "wat"}).status_code == 400


@pytest.mark.django_db
def test_preferences_account_policy_and_opt_out(org_data):
    org, school, _, director = org_data
    api = client(director)
    result = {row["notification_type"]: row for row in api.get(PREFERENCES).json()}
    assert result["CAMERA_OFFLINE"]["in_app"] and not result["CAMERA_OFFLINE"]["push"]
    assert result["MEMBERSHIP_UPDATED"]["required_in_app"]
    assert (
        api.patch(
            PREFERENCES,
            {"notification_type": "MEMBERSHIP_UPDATED", "in_app": False},
            format="json",
        ).status_code
        == 400
    )
    assert (
        api.patch(
            PREFERENCES,
            {"notification_type": "CAMERA_OFFLINE", "user": director.user_id},
            format="json",
        ).status_code
        == 400
    )
    assert (
        api.patch(
            PREFERENCES,
            {"notification_type": "CAMERA_RECOVERED", "email": True},
            format="json",
        ).status_code
        == 400
    )
    update = api.patch(
        PREFERENCES,
        {"notification_type": "CAMERA_OFFLINE", "in_app": False},
        format="json",
    )
    assert update.status_code == 200 and not update.json()["in_app"]
    post_notice(org, school)
    assert not Notification.objects.exists()
    publish(
        Kind.MEMBERSHIP_UPDATED,
        organization_id=org.pk,
        recipient_id=director.user_id,
        key="account:1",
        title="Acesso alterado",
        message="Confira a conta.",
    )
    assert api.get(INBOX, {"school_id": school.pk}).json()["count"] == 1


@pytest.mark.django_db
def test_link_is_removed_when_resource_or_membership_changes(org_data):
    org, school, other, _ = org_data
    member = person(org, "scoped@reali.test", schools=[school])
    api = client(member)
    camera = Camera.objects.create(
        school=other, name="Fora do escopo", camera_type=Camera.CameraType.ENTRANCE
    )
    post_notice(org, school, data={"resource": "camera", "resource_id": str(camera.pk)})
    notice = Notification.objects.get(recipient=member.user)
    path = f"{INBOX}{notice.pk}/"
    assert api.get(path).json()["data"] == {}
    assert api.get(INBOX).json()["results"][0]["data"] == {}
    assert api.post(path + "read/").json()["data"] == {}
    assert api.post(path + "archive/").json()["data"] == {}
    Camera.objects.filter(pk=camera.pk).update(school=school)
    assert api.get(path).json()["data"] == {
        "resource": "camera",
        "resource_id": str(camera.pk),
    }
    Notification.objects.filter(pk=notice.pk).update(
        data={"resource": "camera", "resource_id": "missing"}
    )
    assert api.get(path).json()["data"] == {}
    member.school_accesses.all().delete()
    assert api.get(path).status_code == 404
    member.user.is_active = False
    member.user.save(update_fields=["is_active"])
    assert api.get(INBOX).status_code == 401


@pytest.mark.django_db
def test_device_rebind_rotation_multiple_devices_and_scoped_logout(org_data):
    org, _, _, director = org_data
    other = person(org, "other-account@reali.test")
    session = LoginSerializer.get_token(director.user)
    api, rival = client(director, session), client(other)
    first = token_body()
    registered = api.post(DEVICES, first, format="json")
    assert registered.status_code == 201, registered.json()
    device_id = registered.json()["id"]
    assert (
        "push_token" not in registered.json()
        and "installation_secret" not in registered.json()
    )
    device = PushDevice.objects.get(pk=device_id)
    assert first["push_token"].encode() not in bytes(device.encrypted_token)
    assert api.post(DEVICES, first, format="json").json()["id"] == device_id
    assert (
        rival.post(
            DEVICES, {**first, "installation": str(uuid4())}, format="json"
        ).status_code
        == 409
    )
    assert (
        rival.post(
            DEVICES, {**first, "installation_secret": "2" * 64}, format="json"
        ).status_code
        == 409
    )
    assert rival.delete(f"{DEVICES}{device_id}/").status_code == 404
    second_session = LoginSerializer.get_token(director.user)
    second_client = client(director, second_session)
    second = second_client.post(
        DEVICES, token_body("second", platform="IOS"), format="json"
    )
    assert second.status_code == 201
    rotated = {**first, "push_token": "ExpoPushToken[phase-nine-rotated]"}
    assert api.post(DEVICES, rotated, format="json").json()["id"] == device_id
    transferred = rival.post(DEVICES, rotated, format="json")
    assert transferred.status_code == 201 and transferred.json()["id"] == device_id
    assert (
        api.post(
            BASE + "auth/logout/", {"refresh": str(session)}, format="json"
        ).status_code
        == 200
    )
    assert PushDevice.objects.get(pk=device_id).user == other.user
    assert PushDevice.objects.get(pk=second.json()["id"]).is_active
    assert api.post(DEVICES, token_body("revoked"), format="json").status_code == 401
    assert (
        second_client.post(
            BASE + "auth/logout/", {"refresh": str(second_session)}, format="json"
        ).status_code
        == 200
    )
    assert not PushDevice.objects.get(pk=second.json()["id"]).is_active
    assert rival.delete(f"{DEVICES}{device_id}/").status_code == 204
    assert not PushDevice.objects.get(pk=device_id).is_active


def push_queue(org, school, director):
    api = client(director)
    result = api.post(DEVICES, token_body(), format="json")
    assert result.status_code == 201, result.json()
    NotificationPreference.objects.create(
        user=director.user, organization=org, kind=Kind.CAMERA_OFFLINE, push=True
    )
    post_notice(org, school)
    post_notice(org, school)
    assert Notification.objects.count() == 1
    return NotificationDelivery.objects.get(channel=Channel.PUSH)


@pytest.mark.django_db
def test_expo_ticket_receipt_and_retry(org_data, monkeypatch, settings):
    org, school, _, director = org_data
    settings.NOTIFICATION_EXPO_ACCESS_TOKEN = "provider-test-only"
    delivery = push_queue(org, school, director)
    accepted_ticket = "ticket-1"
    responses = iter(
        [
            httpx.Response(503, json={}),
            httpx.Response(200, json={"data": {"status": "ok", "id": accepted_ticket}}),
            httpx.Response(200, json={"data": {}}),
            httpx.Response(200, json={"data": {accepted_ticket: {"status": "ok"}}}),
        ]
    )
    calls = []

    def response(url, **kwargs):
        calls.append((url, kwargs))
        return next(responses)

    monkeypatch.setattr("apps.notifications.delivery.httpx.post", response)
    for status in [Status.PENDING, Status.ACCEPTED, Status.ACCEPTED, Status.CONFIRMED]:
        assert process_due(10) == 1
        delivery.refresh_from_db()
        assert delivery.status == status
        NotificationDelivery.objects.filter(pk=delivery.pk).update(
            next_attempt_at=timezone.now()
        )
    assert delivery.attempt_count == 2 and delivery.receipt_attempt_count == 2
    sent = calls[0][1]
    assert sent["headers"]["Authorization"] == "Bearer provider-test-only"
    assert sent["json"]["data"] == {"notification_id": str(delivery.notification_id)}
    assert sent["json"]["body"] == "Você tem uma atualização."
    assert calls[-1][0].endswith("/getReceipts")
    assert delivery.notification.read_at is None


@pytest.mark.django_db
def test_invalid_token_revokes_only_its_binding(org_data, monkeypatch):
    org, school, _, director = org_data
    delivery = push_queue(org, school, director)
    monkeypatch.setattr(
        "apps.notifications.delivery.httpx.post",
        lambda *args, **kwargs: httpx.Response(
            200,
            json={
                "data": {"status": "error", "details": {"error": "DeviceNotRegistered"}}
            },
        ),
    )
    assert process_due(1) == 1
    delivery.refresh_from_db()
    assert (
        delivery.status == Status.REJECTED
        and delivery.last_error_code == "DeviceNotRegistered"
    )
    assert not PushDevice.objects.get(pk=delivery.device_id).is_active


@pytest.mark.django_db
def test_worker_cancels_revoked_access_and_retries_smtp(org_data, monkeypatch):
    org, school, _, director = org_data
    push = push_queue(org, school, director)
    director.all_schools_access = False
    director.save(update_fields=["all_schools_access"])
    monkeypatch.setattr(
        "apps.notifications.delivery.httpx.post",
        lambda *args, **kwargs: pytest.fail("revoked access reached Expo"),
    )
    assert process_due(1) == 1
    push.refresh_from_db()
    assert push.status == Status.CANCELLED
    SchoolAccess.objects.create(membership=director, school=school)
    NotificationPreference.objects.filter(user=director.user).update(
        push=False, email=True
    )
    post_notice(org, school, key="email-only")
    email = NotificationDelivery.objects.get(channel=Channel.EMAIL)

    def fail(_message):
        raise SMTPException("test")

    monkeypatch.setattr("apps.notifications.delivery.EmailMessage.send", fail)
    assert process_due(1) == 1
    email.refresh_from_db()
    assert (
        email.status == Status.PENDING and email.last_error_code == "smtp_unavailable"
    )
    NotificationDelivery.objects.filter(pk=email.pk).update(
        next_attempt_at=timezone.now()
    )
    monkeypatch.setattr(
        "apps.notifications.delivery.EmailMessage.send", lambda message: 1
    )
    assert process_due(1) == 1
    email.refresh_from_db()
    assert email.status == Status.ACCEPTED and not email.provider_reference


@pytest.mark.django_db
def test_reminder_delivery_revalidates_planned_status(org_data, monkeypatch):
    org, school, _, director = org_data
    api = client(director)
    assert api.post(DEVICES, token_body(), format="json").status_code == 201
    NotificationPreference.objects.create(
        user=director.user,
        organization=org,
        kind=Kind.MEAL_SERVICE_REMINDER,
        push=True,
    )
    now = timezone.now()
    scheduled = timezone.localtime(now) + timedelta(minutes=10)
    meal = MealService.objects.create(
        school=school,
        date=scheduled.date(),
        meal_type=MealService.MealType.LUNCH,
        scheduled_time=scheduled.time(),
    )
    check_meal(meal.pk, now)
    cancel_service(director, meal.pk, "Cancelamento após gerar lembrete")
    monkeypatch.setattr(
        "apps.notifications.delivery.httpx.post",
        lambda *args, **kwargs: pytest.fail("cancelled meal reached Expo"),
    )
    assert process_due(1) == 1
    assert (
        NotificationDelivery.objects.get(channel=Channel.PUSH).status
        == Status.CANCELLED
    )


@pytest.mark.django_db
def test_expo_over_postman_simulation(org_data, monkeypatch):
    base = os.getenv("REALI_POSTMAN_EXPO_TEST_URL")
    if not base:
        pytest.skip("Inicie a simulação HTTP opcional do Expo.")
    target = urlsplit(base)
    assert (
        target.scheme == "http"
        and target.hostname == "127.0.0.1"
        and target.path == "/expo"
    )
    org, school, _, director = org_data
    first = push_queue(org, school, director)
    second = client(director).post(DEVICES, token_body("unavailable"), format="json")
    assert second.status_code == 201
    post_notice(org, school, key="provider-unavailable")
    unavailable = NotificationDelivery.objects.get(
        device_id=second.json()["id"], channel=Channel.PUSH
    )
    original = httpx.post

    def local_provider(url, **kwargs):
        return original(base + urlsplit(url).path, **kwargs)

    monkeypatch.setattr("apps.notifications.delivery.httpx.post", local_provider)
    assert process_due(3) == 3
    first.refresh_from_db()
    unavailable.refresh_from_db()
    assert (
        first.status == Status.ACCEPTED
        and first.provider_reference == "reali-fixture-ticket"
    )
    assert (
        unavailable.status == Status.PENDING
        and unavailable.last_error_code == "expo_unavailable"
    )
    NotificationDelivery.objects.filter(pk=first.pk).update(
        next_attempt_at=timezone.now()
    )
    assert process_due(1) == 1
    first.refresh_from_db()
    assert first.status == Status.CONFIRMED


@pytest.mark.django_db
def test_camera_incidents_heartbeat_detector_sync_recovery_and_escalation(
    org_data, settings
):
    org, school, _, _ = org_data
    settings.NOTIFICATION_ALERT_DELAY_SECONDS = 10
    settings.NOTIFICATION_ESCALATION_SECONDS = 60
    now = timezone.now()
    camera = Camera.objects.create(
        school=school,
        name="Portaria",
        camera_type=Camera.CameraType.ENTRANCE,
        last_seen_at=now,
        video_status=VideoStatus.STREAMING,
        detector_status=DetectorStatus.RUNNING,
        processing_fps=15,
    )
    check_camera(camera.pk, now)
    assert not Notification.objects.exists()
    offline = now + timedelta(seconds=settings.CAMERA_OFFLINE_TIMEOUT_SECONDS + 11)
    check_camera(camera.pk, offline)
    check_camera(camera.pk, offline)
    check_camera(camera.pk, offline + timedelta(seconds=60))
    assert list(
        Notification.objects.filter(kind=Kind.CAMERA_OFFLINE)
        .order_by("created_at")
        .values_list(
            "priority",
            flat=True,
        )
    ) == [Priority.HIGH, Priority.CRITICAL]
    camera.last_seen_at = offline + timedelta(seconds=65)
    camera.save()
    check_camera(camera.pk, camera.last_seen_at)
    assert Notification.objects.filter(kind=Kind.CAMERA_RECOVERED).count() == 1
    camera.detector_status = DetectorStatus.STOPPED
    camera.telemetry_reason = "detector_unavailable"
    camera.pending_events = settings.CAMERA_PENDING_EVENTS_LIMIT
    camera.save()
    CameraHealthEvent.objects.create(
        camera=camera,
        event_type="detector_unavailable",
        previous_status=OperationalStatus.ONLINE,
        new_status=OperationalStatus.ERROR,
        message="Detector interrompido",
        occurred_at=camera.last_seen_at,
    )
    check_camera(camera.pk, camera.last_seen_at)
    check_camera(camera.pk, camera.last_seen_at + timedelta(seconds=11))
    assert (
        Notification.objects.filter(organization=org, kind=Kind.CAMERA_ERROR).count()
        == 1
    )
    assert Notification.objects.filter(kind=Kind.DEVICE_SYNC_DELAY).count() == 1


@pytest.mark.django_db
def test_meals_invitation_and_pending_analytics(org_data, settings, monkeypatch):
    org, school, _, director = org_data
    now = timezone.now()
    local = timezone.localtime(now)
    next_meal = local + timedelta(minutes=10)
    meal = MealService.objects.create(
        school=school,
        date=next_meal.date(),
        meal_type=MealService.MealType.LUNCH,
        scheduled_time=next_meal.time(),
    )
    check_meal(meal.pk, now)
    check_meal(meal.pk, now)
    assert Notification.objects.filter(kind=Kind.MEAL_SERVICE_REMINDER).count() == 1
    cancel_service(director, meal.pk, "Operação cancelada")
    check_meal(meal.pk, now)
    assert Notification.objects.filter(kind=Kind.MEAL_SERVICE_CANCELLED).count() == 1
    today = local.date()
    breakfast = MealService.objects.create(
        school=school,
        date=today,
        meal_type=MealService.MealType.BREAKFAST,
        scheduled_time=local.time(),
    )
    start_preparation(director, breakfast.pk)
    start_serving(director, breakfast.pk)
    finish_service(director, breakfast.pk)
    for kind in (
        Kind.MEAL_SERVICE_STARTED,
        Kind.MEAL_SERVING_STARTED,
        Kind.MEAL_SERVICE_FINISHED,
        Kind.FORECAST_UNAVAILABLE,
    ):
        assert Notification.objects.filter(kind=kind).count() == 1
    forecast_difference(breakfast, {"comparison_eligible": False})
    forecast_difference(
        breakfast,
        {
            "comparison_eligible": True,
            "total_forecast_plates": 100,
            "absolute_error": 35,
        },
    )
    assert Notification.objects.filter(kind=Kind.FORECAST_DIFFERENCE).count() == 1

    settings.REALI_ACTIVATION_URL = "https://reali.example/ativar"
    monkeypatch.setattr(
        "apps.api.invitation_service.deliver_invitation", lambda *args: None
    )
    invite = invite_employee(
        director,
        email="invitee@reali.test",
        role=Membership.Role.COOK,
        all_schools_access=False,
        school_ids=[school.pk],
    )
    assert Notification.objects.filter(kind=Kind.INVITATION_CREATED).count() == 1
    UserInvitation.objects.filter(pk=invite.pk).update(
        expires_at=now + timedelta(hours=1)
    )
    check_invite(invite.pk, now)
    assert Notification.objects.filter(kind=Kind.INVITATION_EXPIRING).count() == 1
    check_invite(invite.pk, now + timedelta(hours=2))
    assert Notification.objects.filter(kind=Kind.INVITATION_CLOSED).count() == 1
    assert AuditLog.objects.filter(action="INVITATION_EXPIRED").exists()

    day = today - timedelta(days=1)
    pending = PendingDailyMetrics.objects.create(
        school=school,
        reference_date=day,
        queued_at=now,
        first_queued_at=now - timedelta(hours=2),
    )
    mark_dirty([(school.pk, day)])
    pending.refresh_from_db()
    assert pending.first_queued_at < pending.queued_at
    assert check_due(now, 50) > 0
    assert Notification.objects.filter(kind=Kind.DATA_STALE).count() == 1


@pytest.mark.django_db
def test_audited_adjustment_idempotency_reversal_and_rescope(org_data, monkeypatch):
    org, school, other, director = org_data
    restricted = person(org, "limited@reali.test", schools=[other])
    teacher = person(org, "teacher@reali.test", role=Membership.Role.TEACHER)
    camera = Camera.objects.create(
        school=school, name="Portaria", camera_type=Camera.CameraType.ENTRANCE
    )
    count = StudentCount.objects.create(
        camera=camera,
        quantity=8,
        recorded_at=timezone.now(),
        external_event_id="adjustment-source",
    )
    api = client(director)
    day = timezone.localdate(count.recorded_at)
    rebuild_daily_metrics(school, day)
    body = {
        "event_type": "STUDENT_ENTRY",
        "count_id": str(count.pk),
        "delta": -3,
        "reason": "Conferência",
    }
    key = str(uuid4())
    headers = {"HTTP_IDEMPOTENCY_KEY": key}
    assert client(teacher).post(ADJUSTMENTS, body, format="json").status_code == 403
    assert client(restricted).post(ADJUSTMENTS, body, format="json").status_code == 404
    assert client(restricted).patch(
        f"{BASE}schools/{school.pk}/", {"name": "Indevido"}, format="json"
    ).status_code in {403, 404}
    saved = api.post(ADJUSTMENTS, body, format="json", **headers)
    assert saved.status_code == 201, saved.json()
    record = saved.json()
    assert (
        api.post(ADJUSTMENTS, body, format="json", **headers).json()["id"]
        == record["id"]
    )
    assert (
        api.post(
            ADJUSTMENTS, {**body, "delta": -4}, format="json", **headers
        ).status_code
        == 409
    )
    path = f"{ADJUSTMENTS}{record['id']}/"
    assert api.get(path).json()["audit_log"] == record["audit_log"]
    audit_path = f"{AUDIT}{record['audit_log']}/"
    assert api.get(audit_path).json()["request_id"] == saved.headers["X-Request-ID"]
    assert client(restricted).get(audit_path).status_code == 404
    assert client(teacher).get(AUDIT).status_code == 403
    assert (
        api.patch(audit_path, {"action": "REWRITTEN"}, format="json").status_code == 405
    )
    assert (
        api.get(
            AUDIT, {"action": "COUNT_ADJUSTMENT_CREATED", "school_id": school.pk}
        ).json()["count"]
        == 1
    )
    assert AuditLog.objects.filter(
        action="ADMIN_ACCESS_DENIED", actor=teacher.user
    ).exists()
    assert (
        api.post(ADJUSTMENTS, {**body, "delta": -6}, format="json").status_code == 400
    )
    rebuild_daily_metrics(school, day)
    assert (
        DailyMetrics.objects.get(
            school=school, reference_date=day
        ).total_student_entries
        == 5
    )
    assert Notification.objects.filter(kind=Kind.DATA_RECONCILED).exists()
    assert (
        api.post(path + "reverse/", {"reason": "Restaurar"}, format="json").status_code
        == 201
    )
    assert (
        api.post(path + "reverse/", {"reason": "Repetição"}, format="json").status_code
        == 400
    )
    assert (
        CountAdjustment.objects.count() == 2
        and StudentCount.objects.get(pk=count.pk).quantity == 8
    )

    def fail(*args, **kwargs):
        raise DatabaseError("audit unavailable")

    monkeypatch.setattr("apps.counting.adjustments.audit", fail)
    with pytest.raises(DatabaseError):
        api.post(ADJUSTMENTS, body, format="json")
    assert CountAdjustment.objects.count() == 2


@pytest.mark.django_db(transaction=True)
def test_concurrent_event_and_worker_claim():
    if connection.vendor != "postgresql":
        pytest.skip("O teste exige PostgreSQL e SKIP LOCKED.")
    org = Organization.objects.create(name="Rede concorrente")
    school = School.objects.create(name="Escola", organization=org, code="001")
    director = person(org, "concurrency@reali.test")
    NotificationPreference.objects.create(
        user=director.user, organization=org, kind=Kind.CAMERA_OFFLINE, email=True
    )
    publishing = Barrier(2)

    def run(worker):
        try:
            return worker()
        finally:
            connections.close_all()

    def publish_copy():
        publishing.wait(timeout=5)
        post_notice(org, school)

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(run, [publish_copy, publish_copy]))
        assert Notification.objects.count() == 1
        claims = list(pool.map(run, [claim, claim]))
    assert sum(item is not None for item in claims) == 1
    delivery = NotificationDelivery.objects.get(channel=Channel.EMAIL)
    assert delivery.status == Status.SENT and delivery.attempt_count == 1
    NotificationDelivery.objects.filter(pk=delivery.pk).update(
        lease_until=timezone.now() - timedelta(seconds=1)
    )
    restarted = claim()
    assert (
        restarted.pk == delivery.pk
        and restarted.lease_id != delivery.lease_id
        and restarted.attempt_count == 2
    )


@pytest.mark.django_db
def test_audit_metadata_is_sanitized(org_data):
    org, _, _, director = org_data
    row = audit(
        "TEST_RECORD",
        director,
        organization=org,
        actor=director.user,
        details={
            "password": "test",
            "nested": {"authorization": "test"},
            "role": "COOK",
        },
    )
    assert row.details == {"nested": {}, "role": "COOK"}
    assert client(director).get(f"{AUDIT}{row.pk}/").json()["metadata"] == {
        "role": "COOK"
    }
