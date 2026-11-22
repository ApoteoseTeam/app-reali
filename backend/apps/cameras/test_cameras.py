import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier, Event
from urllib.request import Request, urlopen

import pytest
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import (
    IntegrityError,
    close_old_connections,
    connection,
    connections,
    transaction,
)
from django.utils import timezone
from rest_framework.test import APIClient

from apps.api.models import AuditLog, CameraCredential
from apps.institutions.models import Organization, School
from apps.users.models import Membership, SchoolAccess, User

from .authentication import DeviceAuthentication
from .models import Camera, CameraHealthEvent, DeviceCredential, EdgeDevice

pytestmark = pytest.mark.django_db

BASE = "/api/v1/"
HEARTBEAT = BASE + "device/heartbeat/"
CONFIGURATION = BASE + "device/configuration/"
PASSWORD = "Long-camera-fixture-password-621!"


@pytest.fixture(autouse=True)
def reset_rate_limits():
    cache.clear()


@pytest.fixture
def installation():
    organization = Organization.objects.create(name="Rede A")
    school = School.objects.create(name="Escola A", code="A", organization=organization)
    branch = School.objects.create(name="Escola B", code="B", organization=organization)
    external = School.objects.create(
        name="Outra rede",
        code="X",
        organization=Organization.objects.create(name="Rede B"),
    )
    device = EdgeDevice.objects.create(name="Agente da escola", school=school)
    entrance = Camera.objects.create(
        name="Portaria", school=school, edge_device=device, camera_type="ENTRANCE"
    )
    cafeteria = Camera.objects.create(
        name="Cantina", school=school, edge_device=device, camera_type="CAFETERIA"
    )
    director = User.objects.create_user("director@example.com", PASSWORD)
    Membership.objects.create(
        user=director,
        organization=organization,
        role="DIRECTOR",
        all_schools_access=True,
    )
    return organization, school, branch, external, device, entrance, cafeteria, director


def human(user, organization, *, jwt=False):
    client = APIClient()
    headers = {"HTTP_X_ORGANIZATION_ID": str(organization.pk)}
    if jwt:
        session = client.post(
            BASE + "auth/login/",
            {"email": user.email, "password": PASSWORD},
            format="json",
        )
        assert session.status_code == 200
        headers["HTTP_AUTHORIZATION"] = "Bearer " + session.json()["access"]
    else:
        client.force_authenticate(user)
    client.credentials(**headers)
    return client


def device_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Device {token}")
    return client


def issue(director, organization, device, **extra):
    result = human(director, organization).post(
        BASE + f"edge-devices/{device.pk}/credentials/",
        {"password": PASSWORD, **extra},
        format="json",
    )
    assert result.status_code == 201, result.data
    return result


def sample(camera, video="STREAMING", detector="RUNNING", fps=19.8, pending=0):
    return {
        "camera_id": str(camera.pk),
        "video_status": video,
        "detector_status": detector,
        "processing_fps": fps,
        "pending_events": pending,
    }


def heartbeat(client, *cameras, observed_at=None):
    data = {"agent_version": "1.0.0", "cameras": list(cameras)}
    if observed_at is not None:
        data["observed_at"] = (
            observed_at.isoformat()
            if hasattr(observed_at, "isoformat")
            else observed_at
        )
    return client.post(HEARTBEAT, data, format="json")


def role_user(organization, school, role):
    user = User.objects.create_user(f"{role.lower()}-{school.pk}@example.com", PASSWORD)
    membership = Membership.objects.create(
        user=user, role=role, organization=organization
    )
    SchoolAccess.objects.create(membership=membership, school=school)
    return user


def test_create_bind_and_activate_disable_camera_and_device(installation):
    organization, school, branch, external, _, _, _, director = installation
    client = human(director, organization, jwt=True)
    device_response = client.post(
        BASE + "edge-devices/",
        {"name": "Agente novo", "school": str(school.pk)},
        format="json",
    )
    assert device_response.status_code == 201
    device = EdgeDevice.objects.get(pk=device_response.json()["id"])
    assert device_response.json()["connection_status"] == "UNKNOWN"

    payload = {
        "name": "Nova portaria",
        "school": str(school.pk),
        "camera_type": "ENTRANCE",
        "edge_device": str(device.pk),
    }
    created = client.post(BASE + "cameras/", payload, format="json")
    assert created.status_code == 201
    camera_id = created.json()["id"]
    assert created.json()["operational_status"] == "UNKNOWN"
    assert client.get(BASE + f"cameras/{camera_id}/").json()["edge_device"] == str(
        device.pk
    )
    assert (
        client.post(
            BASE + "cameras/", {**payload, "school": str(branch.pk)}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(
            BASE + "cameras/", {**payload, "school": str(external.pk)}, format="json"
        ).status_code
        == 400
    )
    with pytest.raises(ValidationError):
        Camera.objects.create(
            name="Incompatível",
            school=branch,
            camera_type="ENTRANCE",
            edge_device=device,
        )

    assert (
        client.post(BASE + f"cameras/{camera_id}/deactivate/").json()["is_active"]
        is False
    )
    assert (
        client.post(BASE + f"cameras/{camera_id}/activate/").json()["is_active"] is True
    )
    assert (
        client.patch(
            BASE + f"edge-devices/{device.pk}/", {"is_active": False}, format="json"
        ).json()["connection_status"]
        == "DISABLED"
    )
    assert AuditLog.objects.filter(
        action="EDGE_DEVICE_DEACTIVATED", object_id=device.pk
    ).exists()
    assert (
        CameraHealthEvent.objects.filter(
            camera_id=camera_id, event_type="CAMERA_DEACTIVATED"
        ).count()
        == 1
    )


def test_permission_matrix_and_internal_support(installation):
    org, school, branch, external, device, entrance, cafeteria, director = installation
    missing = Camera.objects.create(
        name="Outra unidade", camera_type="CAFETERIA", school=branch
    )
    outsider = role_user(external.organization, external, "DIRECTOR")
    assert (
        human(outsider, external.organization)
        .get(BASE + f"cameras/{entrance.pk}/status/")
        .status_code
        == 404
    )
    scoped_director = role_user(org, school, "DIRECTOR")
    admin = human(scoped_director, org)
    assert admin.get(BASE + f"cameras/{missing.pk}/status/").status_code == 404
    assert admin.get(BASE + f"cameras/{entrance.pk}/status/").status_code == 200

    manager = human(role_user(org, school, "MANAGER"), org)
    assert (
        manager.get(BASE + f"cameras/{entrance.pk}/health-history/").status_code == 200
    )
    assert (
        manager.post(
            BASE + "cameras/", {"school": str(school.pk)}, format="json"
        ).status_code
        == 403
    )
    assert (
        manager.post(
            BASE + f"edge-devices/{device.pk}/credentials/",
            {"password": PASSWORD},
            format="json",
        ).status_code
        == 403
    )

    cook = human(role_user(org, school, "COOK"), org)
    assert [row["id"] for row in cook.get(BASE + "cameras/").json()["results"]] == [
        str(cafeteria.pk)
    ]
    assert cook.get(BASE + f"cameras/{entrance.pk}/status/").status_code == 404
    assert (
        "edge_device" not in cook.get(BASE + f"cameras/{cafeteria.pk}/status/").json()
    )
    assert cook.get(BASE + f"cameras/{cafeteria.pk}/health-history/").status_code == 403
    assert (
        human(role_user(org, school, "TEACHER"), org).get(BASE + "cameras/").status_code
        == 403
    )

    assert human(director, org).get(BASE + "admin/edge-devices/").status_code == 403
    operator = User.objects.create_user("support@example.com", PASSWORD, is_staff=True)
    assert human(operator, org).get(BASE + "admin/edge-devices/").status_code == 403
    operator.user_permissions.add(
        Permission.objects.get(codename="support_camera_devices")
    )
    operator = User.objects.get(pk=operator.pk)
    assert human(operator, org).get(BASE + "admin/edge-devices/").json()["count"] == 1
    assert human(operator, org).get(BASE + "edge-devices/").status_code == 403


def test_credentials_jwt_separation_rotation_revocation_and_expiry(
    installation, caplog
):
    org, school, _, _, device, entrance, _, director = installation
    admin = human(director, org, jwt=True)
    path = BASE + f"edge-devices/{device.pk}/"
    assert (
        admin.post(
            path + "credentials/", {"password": "incorreta"}, format="json"
        ).status_code
        == 403
    )
    assert (
        admin.post(
            path + "credentials/",
            {
                "password": PASSWORD,
                "expires_at": (timezone.now() - timedelta(days=1)).isoformat(),
            },
            format="json",
        ).status_code
        == 400
    )
    first = admin.post(path + "credentials/", {"password": PASSWORD}, format="json")
    assert first.status_code == 201 and first["Cache-Control"] == "no-store"
    old = first.json()["token"]
    stored = DeviceCredential.objects.get(pk=first.json()["id"])
    assert stored.token_hash != old and old.startswith(stored.token_prefix + ".")
    assert "token_hash" not in first.json()
    assert old not in admin.get(path).content.decode()
    assert (
        admin.post(
            path + "credentials/", {"password": PASSWORD}, format="json"
        ).status_code
        == 400
    )
    assert admin.get(CONFIGURATION).status_code == 401
    assert heartbeat(admin, sample(entrance)).status_code == 401
    assert device_client(old).get(BASE + "auth/me/").status_code == 401
    assert heartbeat(device_client("garbage"), sample(entrance)).status_code == 401
    assert heartbeat(device_client(old), sample(entrance)).status_code == 200
    stored.refresh_from_db()
    assert stored.last_used_at is not None

    expires_at = (timezone.now() + timedelta(days=1)).isoformat()
    second = admin.post(
        path + "rotate-credential/",
        {"password": PASSWORD, "expires_at": expires_at},
        format="json",
    )
    assert second.status_code == 201
    current = second.json()["token"]
    assert old != current
    assert heartbeat(device_client(old), sample(entrance)).status_code == 401
    assert heartbeat(device_client(current), sample(entrance)).status_code == 200
    with pytest.raises(IntegrityError), transaction.atomic():
        DeviceCredential.objects.create(
            edge_device=device, token_prefix="a" * 24, token_hash="b" * 64
        )
    with pytest.raises(IntegrityError), transaction.atomic():
        DeviceCredential.objects.filter(pk=second.json()["id"]).update(is_active=False)
    DeviceCredential.objects.filter(pk=second.json()["id"]).update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    assert device_client(current).get(CONFIGURATION).status_code == 401
    third = admin.post(
        path + "rotate-credential/", {"password": PASSWORD}, format="json"
    ).json()["token"]
    assert (
        admin.post(
            path + "revoke-credential/", {"password": PASSWORD}, format="json"
        ).status_code
        == 204
    )
    assert device_client(third).get(CONFIGURATION).status_code == 401

    fourth = admin.post(
        path + "credentials/", {"password": PASSWORD}, format="json"
    ).json()["token"]
    assert admin.patch(path, {"is_active": False}, format="json").status_code == 200
    assert heartbeat(device_client(fourth), sample(entrance)).status_code == 401
    assert old not in caplog.text and all(
        token not in caplog.text for token in (current, third, fourth)
    )
    assert AuditLog.objects.filter(action="DEVICE_CREDENTIAL_ROTATED").count() == 2
    assert school.is_active


def test_failure_throttling(installation, settings, caplog):
    org, _, _, _, device, _, _, director = installation
    token = issue(director, org, device).json()["token"]
    settings.DEVICE_AUTH_FAILURE_LIMIT = 2
    invalid = device_client("invalid-fixture")
    assert invalid.get(CONFIGURATION).status_code == 401
    assert invalid.get(CONFIGURATION).status_code == 401
    blocked = device_client(token).get(CONFIGURATION)
    assert blocked.status_code == 429 and "Retry-After" in blocked
    assert "invalid-fixture" not in caplog.text
    assert "DEVICE_AUTH_FAILED" in caplog.text


def test_heartbeat_validation_isolation_and_order(installation):
    org, school, _, external, device, entrance, cafeteria, director = installation
    first = issue(director, org, device)
    client = device_client(first.json()["token"])
    other_device = EdgeDevice.objects.create(school=school, name="Outro agente")
    other_camera = Camera.objects.create(
        school=school, edge_device=other_device, name="Outra", camera_type="CAFETERIA"
    )
    outside = Camera.objects.create(
        school=external, name="Externa", camera_type="ENTRANCE"
    )
    for rejected in (other_camera, outside):
        assert heartbeat(client, sample(entrance), sample(rejected)).status_code == 403
    assert heartbeat(client, sample(entrance, fps=-1)).status_code == 400
    assert heartbeat(client, sample(entrance, fps="NaN")).status_code == 400
    assert heartbeat(client, sample(entrance, pending=-1)).status_code == 400
    assert heartbeat(client, sample(entrance, video="WRONG")).status_code == 400
    assert heartbeat(client, sample(entrance), sample(entrance)).status_code == 400
    assert (
        heartbeat(
            client, sample(entrance), observed_at="2026-01-01T10:00:00"
        ).status_code
        == 400
    )
    assert (
        heartbeat(
            client, sample(entrance), observed_at=timezone.now() + timedelta(minutes=1)
        ).status_code
        == 400
    )
    device.refresh_from_db()
    assert device.last_seen_at is None

    stamp = timezone.now()
    accepted = heartbeat(
        client,
        sample(entrance),
        sample(cafeteria, detector="STOPPED"),
        observed_at=stamp,
    )
    assert accepted.json() == {"status": "ok", "accepted": True, "updated_cameras": 2}
    device.refresh_from_db()
    assert device.agent_version == "1.0.0" and device.last_observed_at == stamp
    seen = device.last_seen_at
    assert not heartbeat(
        client,
        sample(entrance, video="ERROR"),
        observed_at=stamp - timedelta(seconds=1),
    ).json()["accepted"]
    assert not heartbeat(client, sample(entrance), observed_at=stamp).json()["accepted"]
    device.refresh_from_db()
    entrance.refresh_from_db()
    assert device.last_seen_at == seen and entrance.health_status == "ONLINE"
    assert entrance.health_events.count() == 1


def test_status_history_offline_retention_and_limited_history(installation, settings):
    org, school, _, _, device, entrance, cafeteria, director = installation
    client = device_client(issue(director, org, device).json()["token"])
    admin = human(director, org)
    path = BASE + f"cameras/{entrance.pk}/"
    assert admin.get(path + "status/").json()["operational_status"] == "UNKNOWN"
    assert (
        heartbeat(
            client, sample(entrance), sample(cafeteria, detector="STOPPED")
        ).status_code
        == 200
    )
    healthy = admin.get(path + "status/").json()
    assert healthy["operational_status"] == healthy["agent_status"] == "ONLINE"
    fault = admin.get(BASE + f"cameras/{cafeteria.pk}/status/").json()
    assert fault["operational_status"] == "ERROR" and fault["agent_status"] == "ONLINE"
    assert heartbeat(client, sample(entrance, fps=5)).status_code == 200
    assert admin.get(path + "status/").json()["operational_status"] == "DEGRADED"
    assert heartbeat(client, sample(entrance, fps=4)).status_code == 200
    assert entrance.health_events.count() == 2
    before = timezone.now() - timedelta(
        seconds=settings.CAMERA_OFFLINE_TIMEOUT_SECONDS + 1
    )
    Camera.objects.filter(pk=entrance.pk).update(last_seen_at=before)
    # Agent can be online while an individually omitted camera is offline.
    current = admin.get(path + "status/").json()
    assert (
        current["operational_status"] == "OFFLINE"
        and current["agent_status"] == "ONLINE"
    )
    assert entrance.health_events.count() == 2
    call_command("maintain_camera_health")
    call_command("maintain_camera_health")
    assert entrance.health_events.filter(event_type="timeout").count() == 1

    old = timezone.now() - timedelta(days=settings.CAMERA_HEALTH_RETENTION_DAYS + 1)
    stale_event = CameraHealthEvent.objects.create(
        camera=entrance,
        event_type="old",
        previous_status="ONLINE",
        new_status="ERROR",
        message="Falha anterior.",
        occurred_at=old,
    )
    nutritionist = human(role_user(org, school, "NUTRITIONIST"), org)
    assert admin.get(path + "health-history/").json()["count"] == 4
    assert nutritionist.get(path + "health-history/").json()["count"] == 3
    call_command("maintain_camera_health")
    assert not CameraHealthEvent.objects.filter(pk=stale_event.pk).exists()
    assert heartbeat(client, sample(entrance)).status_code == 200
    assert admin.get(path + "status/").json()["operational_status"] == "ONLINE"


def line_configuration():
    return {
        "event_kind": "STUDENT_ENTRY",
        "trigger": "LINE_CROSSING",
        "desired_fps": 20,
        "confidence_threshold": 0.55,
        "algorithm_version": "1.2.0",
        "counting_line": {
            "start": {"x": 0.1, "y": 0.5},
            "end": {"x": 0.9, "y": 0.5},
            "direction": "NEGATIVE_TO_POSITIVE",
        },
        "tracker": {"track_buffer_frames": 40, "match_threshold": 0.8},
    }


def test_versioned_configuration_is_device_scoped_and_validated(installation):
    org, school, _, _, device, entrance, cafeteria, director = installation
    another_device = EdgeDevice.objects.create(name="Segundo", school=school)
    another_camera = Camera.objects.create(
        name="Outra", school=school, edge_device=another_device, camera_type="ENTRANCE"
    )
    admin = human(director, org)
    entrance_path = BASE + f"cameras/{entrance.pk}/configuration/"
    cafeteria_path = BASE + f"cameras/{cafeteria.pk}/configuration/"
    config = line_configuration()
    assert admin.get(entrance_path).status_code == 404
    assert (
        admin.put(
            entrance_path,
            {**config, "algorithm_version": "https://host.invalid"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        admin.put(
            entrance_path, {**config, "rtsp_password": "fixture"}, format="json"
        ).status_code
        == 400
    )
    assert (
        admin.put(
            entrance_path, {**config, "confidence_threshold": 2}, format="json"
        ).status_code
        == 400
    )
    line = config["counting_line"]
    assert (
        admin.put(
            entrance_path,
            {**config, "counting_line": {**line, "end": line["start"]}},
            format="json",
        ).status_code
        == 400
    )
    assert admin.put(cafeteria_path, config, format="json").status_code == 400
    assert admin.put(entrance_path, config, format="json").json()["version"] == 1
    assert admin.put(entrance_path, config, format="json").json()["version"] == 1
    assert (
        admin.put(entrance_path, {**config, "desired_fps": 22}, format="json").json()[
            "version"
        ]
        == 2
    )
    zone = {key: value for key, value in config.items() if key != "counting_line"}
    zone.update(
        event_kind="PLATE_DELIVERY",
        trigger="DELIVERY_ZONE",
        region_of_interest={
            "top_left": {"x": 0.2, "y": 0.2},
            "bottom_right": {"x": 0.8, "y": 0.8},
        },
    )
    assert admin.put(cafeteria_path, zone, format="json").status_code == 200
    assert (
        admin.put(
            BASE + f"cameras/{another_camera.pk}/configuration/", config, format="json"
        ).status_code
        == 200
    )

    client = device_client(issue(director, org, device).json()["token"])
    payload = client.get(CONFIGURATION).json()
    assert payload["device_identifier"] == str(device.device_identifier)
    assert {row["id"] for row in payload["cameras"]} == {
        str(entrance.pk),
        str(cafeteria.pk),
    }
    assert {row["configuration"]["version"] for row in payload["cameras"]} == {1, 2}
    assert admin.post(BASE + f"cameras/{cafeteria.pk}/deactivate/").status_code == 200
    assert [row["id"] for row in client.get(CONFIGURATION).json()["cameras"]] == [
        str(entrance.pk)
    ]


def test_legacy_heartbeat_compatible_until_first_attachment(installation, settings):
    org, school, _, _, device, _, _, director = installation
    camera = Camera.objects.create(name="Legada", school=school, camera_type="ENTRANCE")
    raw, digest = CameraCredential.generate_secret()
    credential = CameraCredential.objects.create(camera=camera, secret_hash=digest)
    client = APIClient()
    client.credentials(HTTP_X_CAMERA_ID=str(camera.pk), HTTP_X_CAMERA_KEY=raw)
    assert client.post(HEARTBEAT).json() == {
        "status": "ok",
        "camera_id": str(camera.pk),
    }
    assert client.get(CONFIGURATION).status_code == 401
    settings.CAMERA_LEGACY_AUTH_ENABLED = False
    assert client.post(HEARTBEAT).status_code == 403
    settings.CAMERA_LEGACY_AUTH_ENABLED = True
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
    credential.refresh_from_db()
    assert credential.revoked_at is not None
    assert client.post(HEARTBEAT).status_code == 403
    assert client.post(BASE + "device/counts/", {}, format="json").status_code == 403


@pytest.mark.django_db(transaction=True)
def test_python_reference_io_over_http(installation, live_server):
    org, _, _, _, device, entrance, cafeteria, director = installation
    token = issue(director, org, device).json()["token"]
    headers = {"Authorization": f"Device {token}", "Content-Type": "application/json"}
    message = json.dumps(
        {
            "agent_version": "fixture-1.0",
            "cameras": [sample(entrance), sample(cafeteria)],
        }
    ).encode()
    with urlopen(
        Request(live_server.url + HEARTBEAT, data=message, headers=headers), timeout=5
    ) as response:
        assert response.status == 200
        assert json.load(response)["updated_cameras"] == 2
    with urlopen(
        Request(live_server.url + CONFIGURATION, headers=headers), timeout=5
    ) as response:
        assert (
            response.status == 200 and response.headers["Cache-Control"] == "no-store"
        )
        assert len(json.load(response)["cameras"]) == 2
    device.refresh_from_db()
    assert device.agent_version == "fixture-1.0"
    assert (
        Camera.objects.filter(edge_device=device, health_status="ONLINE").count() == 2
    )


@pytest.mark.django_db(transaction=True)
def test_parallel_heartbeats_are_serialized(installation):
    if connection.vendor != "postgresql":
        pytest.skip("A verificação de locks requer PostgreSQL.")
    org, _, _, _, device, entrance, _, director = installation
    token = issue(director, org, device).json()["token"]
    stamp = timezone.now()
    synchronize = Barrier(2)

    def send():
        close_old_connections()
        try:
            synchronize.wait(timeout=10)
            result = heartbeat(
                device_client(token), sample(entrance), observed_at=stamp
            )
            return result.status_code, result.json()["accepted"]
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: send(), range(2)))
    assert sorted(results) == [(200, False), (200, True)]
    assert entrance.health_events.count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("operation", ["rotate-credential", "revoke-credential"])
def test_inflight_credential_is_rechecked_under_lock(
    installation, monkeypatch, operation
):
    if connection.vendor != "postgresql":
        pytest.skip("A verificação de locks requer PostgreSQL.")
    org, _, _, _, device, entrance, _, director = installation
    token = issue(director, org, device).json()["token"]
    authenticated = Event()
    resume = Event()
    original = DeviceAuthentication.authenticate

    def pause_after_auth(self, request):
        result = original(self, request)
        if result is not None:
            authenticated.set()
            assert resume.wait(timeout=10)
        return result

    def send():
        close_old_connections()
        try:
            return heartbeat(device_client(token), sample(entrance)).status_code
        finally:
            connections.close_all()

    monkeypatch.setattr(DeviceAuthentication, "authenticate", pause_after_auth)
    with ThreadPoolExecutor(max_workers=1) as executor:
        in_flight = executor.submit(send)
        assert authenticated.wait(timeout=10)
        try:
            response = human(director, org).post(
                BASE + f"edge-devices/{device.pk}/{operation}/",
                {"password": PASSWORD},
                format="json",
            )
            assert response.status_code == (
                201 if operation == "rotate-credential" else 204
            )
        finally:
            resume.set()
        assert in_flight.result(timeout=10) == 401
    entrance.refresh_from_db()
    assert entrance.last_seen_at is None
