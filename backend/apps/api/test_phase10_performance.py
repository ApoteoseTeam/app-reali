import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from math import ceil
from statistics import mean
from time import perf_counter, process_time

import httpx
import psutil
import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai.test_real_inova import provider as provider
from apps.analytics.models import DailyMetrics
from apps.institutions.models import Organization, School
from apps.notifications.delivery import process_due
from apps.notifications.models import Kind, NotificationPreference
from apps.notifications.services import publish
from apps.users.models import Membership, User

from .session_auth import LoginSerializer


def measurements(values):
    latencies = sorted(value[0] for value in values)
    return {
        "requests": len(values),
        "errors": sum(not value[1] for value in values),
        "mean_ms": round(mean(latencies), 2),
        **{
            f"p{percentile}_ms": round(
                latencies[ceil(len(latencies) * percentile / 100) - 1], 2
            )
            for percentile in (50, 95, 99)
        },
    }


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(
    os.getenv("REALI_RUN_QUALITY_LOAD") != "1", reason="Carga local opcional."
)
def test_scoped_http_and_worker_load(live_server, provider, settings):
    assert connection.vendor == "postgresql"
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    cache.clear()
    today = timezone.localdate()
    password = "Local-only-density-fixture-984!a"
    accounts = []
    for number in range(2):
        org = Organization.objects.create(name=f"Rede de teste {number}")
        user = User.objects.create_user(f"load-{number}@reali.example.test", password)
        Membership.objects.create(
            user=user, organization=org, role="DIRECTOR", all_schools_access=True
        )
        for code in (1, 2):
            school = School.objects.create(
                organization=org, name=f"Escola {code}", code=str(code)
            )
            DailyMetrics.objects.bulk_create(
                [
                    DailyMetrics(
                        school=school,
                        reference_date=today - timedelta(days=offset),
                        total_student_entries=25 + number * 100,
                        total_served_plates=22,
                        has_entries=True,
                        has_served=True,
                        calculated_at=timezone.now(),
                    )
                    for offset in range(14)
                ]
            )
            accounts.append(
                (org, school, user, str(LoginSerializer.get_token(user).access_token))
            )
        NotificationPreference.objects.create(
            user=user,
            organization=org,
            kind=Kind.CAMERA_OFFLINE,
            email=True,
        )
        for index in range(12):
            publish(
                Kind.CAMERA_OFFLINE,
                organization_id=org.pk,
                school_id=school.pk,
                key=f"load:{index}",
                title="Aviso sintético",
                message="Atualização de teste.",
            )

    base_url = live_server.url.replace("://localhost", "://127.0.0.1", 1) + "/api/v1/"
    start = today - timedelta(days=13)
    process = psutil.Process()

    def work(index):
        org, school, user, token = accounts[index]
        headers = {"Authorization": f"Bearer {token}", "X-Organization-ID": str(org.pk)}
        paths = {
            "dashboard": f"analytics/dashboard/?school={school.pk}",
            "history": f"analytics/history/daily/?school={school.pk}&start_date={start}&end_date={today}",
        }
        results = []

        def record(client, kind, method, path, **kwargs):
            elapsed = perf_counter()
            try:
                result = client.request(method, path, **kwargs)
                valid = result.status_code == 200
            except httpx.RequestError:
                valid = False
            results.append(
                (
                    kind,
                    (perf_counter() - elapsed) * 1000,
                    valid,
                    process.memory_info().rss,
                )
            )

        with httpx.Client(base_url=base_url, trust_env=False, timeout=15) as client:
            for _ in range(10):
                for name, path in paths.items():
                    record(client, name, "GET", path, headers=headers)
            record(
                client,
                "login",
                "POST",
                "auth/login/",
                json={"email": user.email, "password": password},
            )
            record(
                client,
                "consolidation",
                "POST",
                "analytics/daily/rebuild/",
                headers=headers,
                json={"school": str(school.pk), "date": today.isoformat()},
            )
            record(
                client,
                "realinova",
                "POST",
                "ai/chat/",
                headers=headers,
                json={
                    "school_id": str(school.pk),
                    "message": "Pode analisar o desvio do almoço, por favor?",
                },
            )
        return results

    cpu_start = process_time()
    started = perf_counter()
    with ThreadPoolExecutor(max_workers=4) as pool:
        requests = [row for job in pool.map(work, range(4)) for row in job]
    wall = perf_counter() - started
    cpu = process_time() - cpu_start
    samples = {
        name: measurements(
            [(ms, ok) for observed, ms, ok, _ in requests if name == observed]
        )
        for name, *_ in requests
    }

    org, school, _, token = accounts[0]
    api = APIClient()
    api.credentials(
        HTTP_AUTHORIZATION=f"Bearer {token}", HTTP_X_ORGANIZATION_ID=str(org.pk)
    )
    with CaptureQueriesContext(connection) as queries:
        assert (
            api.get(
                "/api/v1/analytics/dashboard/", {"school": str(school.pk)}
            ).status_code
            == 200
        )
    worker_start = perf_counter()
    deliveries = process_due(100)
    worker_elapsed = perf_counter() - worker_start
    print(
        json.dumps(
            {
                "http": samples,
                "requests_per_second": round(len(requests) / wall, 2),
                "wall_seconds": round(wall, 2),
                "process_cpu_seconds": round(cpu, 2),
                "process_peak_sample_rss_mib": round(
                    max(row[3] for row in requests) / 1024**2, 2
                ),
                "dashboard_sql_queries": len(queries),
                "dashboard_sql_ms": round(
                    sum(float(row["time"]) for row in queries) * 1000, 2
                ),
                "notifications_processed": deliveries,
                "notification_deliveries_per_second": round(
                    deliveries / worker_elapsed, 2
                ),
                "simulated_provider_requests": len(provider.requests),
            }
        )
    )
    assert all(result["errors"] == 0 for result in samples.values())
    assert deliveries == 24
    assert len(provider.requests) == 4
