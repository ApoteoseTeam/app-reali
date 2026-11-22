import json
import math
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

import pytest
from django.core.cache import cache
from django.db import connection
from django.db.models import Sum
from django.utils import timezone

from apps.cameras.models import Camera, EdgeDevice
from apps.cameras.provisioning import change_credential
from apps.institutions.models import Organization, School
from apps.meals.models import MealService
from apps.users.models import User

from .models import CameraCountActivity, DeviceIngestionEvent, PlateCount, StudentCount
from .test_counting import BATCH, COUNTS, event


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(
    os.getenv("REALI_RUN_COUNT_LOAD") != "1", reason="Carga local opcional."
)
def test_school_ingestion_over_http(live_server):
    assert connection.vendor == "postgresql", (
        "Use PostgreSQL isolado para medir a carga."
    )
    cache.clear()
    base_url = live_server.url.replace("://localhost", "://127.0.0.1", 1)
    organization = Organization.objects.create(name="Rede sintética para carga")
    actor = User.objects.create(email="load-fixture@example.com")
    started = timezone.now()
    installations = []
    for index in range(6):
        school = School.objects.create(
            name=f"Escola {index}", code=str(index), organization=organization
        )
        device = EdgeDevice.objects.create(school=school, name="Agente de teste")
        _, token = change_credential(device.pk, actor, "issue")
        entrance = Camera.objects.create(
            school=school, edge_device=device, camera_type="ENTRANCE", name="Portaria"
        )
        cafeteria = Camera.objects.create(
            school=school, edge_device=device, camera_type="CAFETERIA", name="Cantina"
        )
        meal = MealService.objects.create(
            school=school,
            date=timezone.localdate(started),
            meal_type="LUNCH",
            scheduled_time="12:00",
            status="SERVING",
            serving_started_at=started - timedelta(hours=1),
        )
        installations.append((token, entrance, cafeteria, meal))

    def drive(installation):
        token, entrance, cafeteria, meal = installation
        headers = {
            "Authorization": f"Device {token}",
            "Content-Type": "application/json",
        }
        opener = build_opener(ProxyHandler({}))
        statistics = []
        for index in range(30):
            replay = index % 10 == 9
            if not replay:
                events = [event(entrance, started, f"load-{index}-0", 2)]
                if index % 4:
                    events += [
                        event(
                            cafeteria,
                            started,
                            f"load-{index}-1",
                            2,
                            kind="PLATE_SERVED",
                            meal=meal,
                        ),
                        event(entrance, started, f"load-{index}-2", 1),
                        event(
                            cafeteria,
                            started,
                            f"load-{index}-3",
                            1,
                            kind="PLATE_SERVED",
                            meal=meal,
                        ),
                    ]
                batch = len(events) > 1
                path = BATCH if batch else COUNTS
                data = json.dumps({"events": events} if batch else events[0]).encode()
            tick = perf_counter()
            try:
                request = Request(base_url + path, data=data, headers=headers)
                with opener.open(request, timeout=10) as response:
                    status = response.status
                    payload = json.load(response)
                states = (
                    [row.get("status") for row in payload["results"]]
                    if batch
                    else [payload["status"]]
                )
                expected = "already_processed" if replay else "created"
                valid = status == (200 if batch or replay else 201) and states == [
                    expected
                ] * len(events)
            except (HTTPError, OSError, KeyError, ValueError):
                valid = False
            statistics.append((perf_counter() - tick, len(events), replay, valid))
        return statistics

    tick = perf_counter()
    with ThreadPoolExecutor(max_workers=len(installations)) as workers:
        statistics = [
            item for rows in workers.map(drive, installations) for item in rows
        ]
    elapsed = perf_counter() - tick
    latencies = sorted(row[0] * 1000 for row in statistics)
    delivered = sum(row[1] for row in statistics if row[3])
    created = sum(row[1] for row in statistics if not row[2] and row[3])
    replayed = delivered - created
    errors = sum(not row[3] for row in statistics)
    print(
        json.dumps(
            {
                "requests": len(statistics),
                "workers": len(installations),
                "elapsed_seconds": round(elapsed, 3),
                "events_delivered": delivered,
                "events_created": created,
                "events_replayed": replayed,
                "events_per_second": round(delivered / elapsed, 2),
                "created_per_second": round(created / elapsed, 2),
                "p50_ms": round(latencies[math.ceil(len(latencies) * 0.50) - 1], 2),
                "p95_ms": round(latencies[math.ceil(len(latencies) * 0.95) - 1], 2),
                "p99_ms": round(latencies[math.ceil(len(latencies) * 0.99) - 1], 2),
                "errors": errors,
                "error_rate_percent": round(100 * errors / len(statistics), 2),
                "database_ledger": DeviceIngestionEvent.objects.count(),
                "database_counts": StudentCount.objects.count()
                + PlateCount.objects.count(),
                "database_duplicate_counter": CameraCountActivity.objects.aggregate(
                    total=Sum("duplicates")
                )["total"],
            }
        )
    )
    assert errors == 0
    assert DeviceIngestionEvent.objects.count() == created
    assert StudentCount.objects.count() + PlateCount.objects.count() == created
    assert (
        CameraCountActivity.objects.aggregate(total=Sum("duplicates"))["total"]
        == replayed
    )
