from datetime import datetime, time, timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import httpx
import pytest
from django.core import mail
from django.core.cache import cache
from django.utils import timezone

from apps.analytics.models import DailyMetrics
from apps.cameras.models import Camera, EdgeDevice
from apps.cameras.provisioning import change_credential
from apps.counting.models import PlateCount, StudentCount
from apps.institutions.models import Organization, School
from apps.meals.models import (
    AttendanceSnapshot,
    MealForecast,
    MealForecastPolicy,
    MealService,
)
from apps.notifications.alerts import check_due
from apps.users.models import Membership, User


def send(client, method, path, status=200, *, headers=None, body=None):
    response = client.request(method, path, headers=headers, json=body)
    assert response.status_code == status, (method, path, response.status_code)
    return response


def auth(organization_id, token):
    return {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": str(organization_id),
    }


@pytest.mark.django_db(transaction=True)
def test_school_operations_from_invitation_to_report_over_http(
    live_server, settings, monkeypatch
):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.REALI_ACTIVATION_URL = "https://reali.example.test/ativar"
    settings.REALINOVA = {"ENABLED": "true"}
    cache.clear()
    at = timezone.make_aware(datetime.combine(timezone.localdate(), time(11)))
    monkeypatch.setattr(timezone, "now", lambda: at)
    organization = Organization.objects.create(name="Rede sintética")
    school = School.objects.create(
        organization=organization, name="Escola central", code="A1"
    )
    branch = School.objects.create(
        organization=organization, name="Outra unidade", code="A2"
    )
    outside = Organization.objects.create(name="Rede externa sintética")
    School.objects.create(organization=outside, name="Escola externa", code="B1")
    password = f"A.{uuid4().hex}.9"
    director = User.objects.create_user(
        "director-e2e@example.test", password, full_name="Direção E2E"
    )
    Membership.objects.create(
        organization=organization,
        user=director,
        role=Membership.Role.MANAGER,
        all_schools_access=True,
    )
    device = EdgeDevice.objects.create(school=school, name="Agente E2E")
    cameras = {
        kind: Camera.objects.create(
            school=school, edge_device=device, name=kind, camera_type=kind
        )
        for kind in ("ENTRANCE", "CAFETERIA")
    }
    _, token = change_credential(device.pk, director, "issue")
    device_auth = {"Authorization": f"Device {token}"}
    day = timezone.localdate(at)
    meal = MealService.objects.create(
        school=school,
        date=day,
        meal_type="LUNCH",
        scheduled_time=time(12),
        entry_window_start=time(7),
    )
    MealForecastPolicy.objects.create(
        school=school, meal_type="LUNCH", initial_rate=Decimal(".8")
    )
    base = live_server.url.replace("://localhost", "://127.0.0.1", 1) + "/api/v1/"

    with httpx.Client(base_url=base, trust_env=False, timeout=15) as client:
        login = send(
            client,
            "POST",
            "auth/login/",
            body={"email": director.email, "password": password},
        ).json()
        director_headers = auth(organization.pk, login["access"])
        email = "cook-e2e@example.test"
        send(
            client,
            "POST",
            "invitations/",
            201,
            headers=director_headers,
            body={"email": email, "role": "COOK", "school_ids": [str(school.pk)]},
        )
        activation_url = next(
            word for word in mail.outbox[-1].body.split() if word.startswith("https://")
        )
        proof = parse_qs(urlsplit(activation_url).fragment)["token"][0]
        assert send(
            client, "POST", "auth/invitations/verify/", body={"token": proof}
        ).json()["valid"]
        cook_password = f"B.{uuid4().hex}.7"
        send(
            client,
            "POST",
            "auth/invitations/activate/",
            body={
                "token": proof,
                "full_name": "Cozinha E2E",
                "password": cook_password,
                "password_confirmation": cook_password,
            },
        )
        cook = send(
            client,
            "POST",
            "auth/login/",
            body={"email": email, "password": cook_password},
        ).json()
        cook_headers = auth(organization.pk, cook["access"])
        assert [
            row["id"]
            for row in send(
                client, "GET", "auth/me/schools/", headers=cook_headers
            ).json()["results"]
        ] == [str(school.pk)]
        send(
            client,
            "GET",
            "auth/me/schools/",
            403,
            headers=auth(outside.pk, cook["access"]),
        )
        send(
            client,
            "GET",
            f"analytics/dashboard/?school={branch.pk}",
            404,
            headers=cook_headers,
        )

        def heartbeat():
            return {
                "agent_version": "e2e.1",
                "observed_at": at.isoformat(),
                "cameras": [
                    {
                        "camera_id": str(camera.pk),
                        "video_status": "STREAMING",
                        "detector_status": "RUNNING",
                        "processing_fps": 20,
                        "pending_events": 0,
                    }
                    for camera in cameras.values()
                ],
            }

        send(client, "POST", "device/heartbeat/", headers=device_auth, body=heartbeat())
        entry = {
            "event_id": "entry-e2e",
            "event_type": "STUDENT_ENTRY",
            "camera_id": str(cameras["ENTRANCE"].pk),
            "recorded_at": (at - timedelta(minutes=1)).isoformat(),
            "quantity": 25,
        }
        send(client, "POST", "device/counts/", 201, headers=device_auth, body=entry)
        send(client, "POST", "device/counts/", headers=device_auth, body=entry)
        meal_path = f"meal-services/{meal.pk}/"
        planned = send(
            client, "POST", meal_path + "start/", headers=cook_headers, body={}
        ).json()
        assert planned["attendance_snapshot"]["total_student_entries"] == 25
        assert planned["forecast"]["forecast_plates"] == 20
        send(client, "POST", meal_path + "start-serving/", headers=cook_headers)
        plate = {
            "event_id": "plate-e2e",
            "event_type": "PLATE_SERVED",
            "camera_id": str(cameras["CAFETERIA"].pk),
            "meal_service_id": str(meal.pk),
            "recorded_at": at.isoformat(),
            "quantity": 22,
        }
        send(client, "POST", "device/counts/", 201, headers=device_auth, body=plate)
        at += timedelta(seconds=15)
        send(client, "POST", "device/heartbeat/", headers=device_auth, body=heartbeat())
        assert (
            send(client, "POST", meal_path + "finish/", headers=cook_headers).json()[
                "status"
            ]
            == "FINISHED"
        )
        daily = send(
            client,
            "POST",
            "analytics/daily/rebuild/",
            headers=director_headers,
            body={"school": str(school.pk), "date": day.isoformat()},
        ).json()
        assert daily["total_served_plates"] == 22
        report = send(
            client,
            "GET",
            f"analytics/reports/export/?file_format=csv&school={school.pk}&start_date={day}&end_date={day}",
            headers=director_headers,
        )
        assert "22" in report.text and "private" in report.headers["cache-control"]

        answer = send(
            client,
            "POST",
            "ai/chat/",
            headers=director_headers,
            body={
                "school_id": str(school.pk),
                "message": "Quantos pratos foram servidos hoje?",
            },
        ).json()
        assert answer["status"] == "COMPLETED" and "22" in answer["answer"]
        conversations = send(
            client, "GET", "ai/conversations/", headers=director_headers,
        ).json()
        assert conversations["count"] == 1
        history = send(
            client,
            "GET",
            f"ai/conversations/{conversations['results'][0]['id']}/messages/",
            headers=director_headers,
        ).json()
        assert history["count"] == 2

        at += timedelta(
            seconds=settings.CAMERA_OFFLINE_TIMEOUT_SECONDS
            + settings.NOTIFICATION_ALERT_DELAY_SECONDS
            + 1
        )
        check_due(at, 100)
        inbox = f"notifications/?school_id={school.pk}"
        assert (
            send(
                client, "GET", inbox + "&type=CAMERA_OFFLINE", headers=director_headers
            ).json()["count"]
            == 2
        )
        assert (
            send(
                client, "GET", inbox + "&type=CAMERA_OFFLINE", headers=cook_headers
            ).json()["count"]
            == 0
        )
        send(client, "POST", "device/heartbeat/", headers=device_auth, body=heartbeat())
        check_due(at, 100)
        assert (
            send(
                client,
                "GET",
                inbox + "&type=CAMERA_RECOVERED",
                headers=director_headers,
            ).json()["count"]
            == 2
        )

        send(client, "POST", "auth/logout/", body={"refresh": cook["refresh"]})
        send(client, "GET", "auth/me/", 401, headers=cook_headers)

    assert StudentCount.objects.count() == PlateCount.objects.count() == 1
    assert (
        AttendanceSnapshot.objects.count()
        == MealForecast.objects.count()
        == DailyMetrics.objects.count()
        == 1
    )
