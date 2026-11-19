import csv
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta
from decimal import Decimal
from io import StringIO
from threading import Barrier, Event
from time import perf_counter
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.api.models import AuditLog
from apps.cameras.models import Camera, DetectorStatus, EdgeDevice, VideoStatus
from apps.cameras.provisioning import change_credential
from apps.counting import adjustments, ingestion
from apps.counting.models import PlateCount, StudentCount
from apps.institutions.models import Organization, School
from apps.meals.models import AttendanceSnapshot, DataQuality, MealForecast, MealService
from apps.users.models import Membership, SchoolAccess, User

from . import services
from .dirty import mark_dirty
from .models import DailyMetrics, PendingDailyMetrics
from .selectors import errors, performance

ROOT = "/api/v1/analytics/"
pytestmark = pytest.mark.django_db


def api(member, organization=None):
    client = APIClient()
    client.force_authenticate(member.user)
    client.credentials(
        HTTP_X_ORGANIZATION_ID=str((organization or member.organization).pk)
    )
    return client


def membership(school, role, *, all_schools=False):
    user = User.objects.create(email=f"{role.lower()}@example.com")
    member = Membership.objects.create(
        organization=school.organization,
        user=user,
        role=role,
        all_schools_access=all_schools,
    )
    if not all_schools:
        SchoolAccess.objects.create(membership=member, school=school)
    return member


@pytest.fixture
def site():
    cache.clear()
    org = Organization.objects.create(name="Rede de Educação")
    school = School.objects.create(name="Escola São José", code="A", organization=org)
    branch = School.objects.create(name="Escola B", code="B", organization=org)
    foreign = School.objects.create(
        name="Externa",
        code="X",
        organization=Organization.objects.create(name="Outra rede"),
    )
    director = membership(school, "DIRECTOR", all_schools=True)
    device = EdgeDevice.objects.create(name="Agente", school=school)
    entrance = Camera.objects.create(
        name="Portaria", school=school, edge_device=device, camera_type="ENTRANCE"
    )
    cafeteria = Camera.objects.create(
        name="Cantina", school=school, edge_device=device, camera_type="CAFETERIA"
    )
    day = timezone.localdate() - timedelta(days=2)
    at = timezone.make_aware(datetime.combine(day, time(12)))
    return SimpleNamespace(
        org=org,
        school=school,
        branch=branch,
        foreign=foreign,
        director=director,
        device=device,
        entrance=entrance,
        cafeteria=cafeteria,
        day=day,
        at=at,
    )


def make_facts(site):
    entry = StudentCount.objects.create(
        camera=site.entrance,
        quantity=24,
        recorded_at=site.at,
        external_event_id="original",
    )
    meals = []
    for meal_type, predicted, actual in [("LUNCH", 10, 16), ("SNACK", 20, 14)]:
        meal = MealService.objects.create(
            school=site.school,
            date=site.day,
            meal_type=meal_type,
            status="FINISHED",
            scheduled_time=time(12),
            serving_data_quality=DataQuality.COMPLETE,
        )
        snap = AttendanceSnapshot.objects.create(
            meal_service=meal, total_student_entries=24, reference_time=site.at
        )
        MealForecast.objects.create(
            meal_service=meal, attendance_snapshot=snap, forecast_plates=predicted
        )
        PlateCount.objects.create(
            camera=site.cafeteria,
            meal_service=meal,
            quantity=actual,
            recorded_at=site.at,
            external_event_id=meal_type,
        )
        meals.append(meal)
    return entry, meals


@pytest.mark.parametrize(
    ("predicted", "actual", "difference", "absolute", "percentage", "reason"),
    [
        (11, 10, 1, 1, "10.00", None),
        (7, 8, -1, 1, "12.50", None),
        (7, 7, 0, 0, "0.00", None),
        (7, 0, 7, 7, None, "ZERO_ACTUAL"),
        (7, None, None, None, None, "INSUFFICIENT_DATA"),
    ],
)
def test_formulas(predicted, actual, difference, absolute, percentage, reason):
    assert errors(predicted, actual) == {
        "forecast_difference": difference,
        "absolute_error": absolute,
        "percentage_error": Decimal(percentage) if percentage is not None else None,
        "percentage_error_reason": reason,
    }
    assert performance(0, 0, 0)["wape_reason"] == "INSUFFICIENT_DATA"
    assert performance(1, 7, 0)["wape_reason"] == "ZERO_ACTUAL"


def test_daily_rebuild_quality_signed_adjustment_and_audit(site):
    entry, meals = make_facts(site)
    target = PlateCount.objects.get(meal_service=meals[0])
    client = api(site.director)
    target_filters = {"school": site.school.pk, "date": site.day}
    first = client.post(ROOT + "daily/rebuild/", target_filters)
    assert first.status_code == 200, first.data
    assert first.data["total_student_entries"] == 24
    assert (
        first.data["total_forecast_plates"] == first.data["total_served_plates"] == 30
    )
    assert first.data["absolute_error"] == 0
    assert first.data["sum_absolute_error"] == 12
    assert first.data["mae"] == "6.00" and first.data["wape"] == "40.00"
    assert first.data["data_status"] == "PROVISIONAL"
    repeated = client.post(ROOT + "daily/rebuild/", target_filters)
    assert repeated.data["calculated_at"] == first.data["calculated_at"]
    for kind, count, delta in [
        ("STUDENT_ENTRY", entry, -3),
        ("PLATE_SERVED", target, -16),
    ]:
        response = client.post(
            "/api/v1/count-adjustments/",
            {
                "event_type": kind,
                "count_id": count.pk,
                "delta": delta,
                "reason": "Conferência",
            },
            format="json",
        )
        assert response.status_code == 201, response.data
    dashboard = client.get(ROOT + "dashboard/", target_filters).json()
    assert dashboard["stale"] and dashboard["total_student_entries"] == 24
    assert len(dashboard["meal_services"]) == 2
    output = StringIO()
    call_command("reconcile_daily_metrics", "--limit", "1", stdout=output)
    assert "Consolidados 1 dias" in output.getvalue()
    row = client.get(ROOT + f"daily/{first.data['id']}/").json()
    assert (row["total_student_entries"], row["total_served_plates"]) == (21, 14)
    assert (
        row["data_status"] == "REVISED" and not row["stale"] and not row["is_complete"]
    )
    assert row["calculated_at"] != first.data["calculated_at"]
    assert client.get(ROOT + "daily/").json()["count"] == 1
    meal = client.get(ROOT + f"meal-services/{meals[0].pk}/").json()
    assert (meal["snapshot_entries"], meal["total_served_plates"]) == (24, 0)
    assert meal["percentage_error_reason"] == "ZERO_ACTUAL"
    log = AuditLog.objects.get(action="DAILY_METRICS_REVISED")
    assert (
        log.details["before"]["total_served_plates"],
        log.details["after"]["total_served_plates"],
    ) == (30, 14)
    with pytest.raises(IntegrityError), transaction.atomic():
        DailyMetrics.objects.create(school=site.school, reference_date=site.day)


def test_closing_policy_observes_pending_telemetry(site):
    make_facts(site)
    now = timezone.now()
    EdgeDevice.objects.filter(pk=site.device.pk).update(last_seen_at=now)
    Camera.objects.filter(school=site.school).update(
        last_seen_at=now,
        video_status=VideoStatus.STREAMING,
        detector_status=DetectorStatus.RUNNING,
        processing_fps=500,
        pending_events=0,
    )
    Camera.objects.filter(pk=site.entrance.pk).update(pending_events=1)
    assert not services.rebuild_daily_metrics(site.school, site.day).is_complete
    Camera.objects.filter(pk=site.entrance.pk).update(pending_events=0)
    row = services.rebuild_daily_metrics(site.school, site.day)
    assert row.is_complete and row.data_status == "COMPLETE"
    assert not services.rebuild_daily_metrics(
        site.school, timezone.localdate()
    ).is_complete


def test_history_buckets_filters_summary_and_pagination(site):
    _, meals = make_facts(site)
    first = services.rebuild_daily_metrics(site.school, site.day)
    earlier = site.day - timedelta(days=1)
    DailyMetrics.objects.create(
        school=site.school, reference_date=earlier, total_student_entries=7
    )
    DailyMetrics.objects.create(
        school=site.branch, reference_date=site.day, total_student_entries=5
    )
    DailyMetrics.objects.create(
        school=site.foreign, reference_date=site.day, total_student_entries=999
    )
    mark_dirty([(site.school.pk, site.day - timedelta(days=2))])
    client = api(site.director)
    filters = {
        "school": site.school.pk,
        "start_date": site.day - timedelta(days=2),
        "end_date": site.day,
    }
    days = client.get(ROOT + "history/", filters).json()["results"]
    assert (
        days[0]["data_status"] == "NO_DATA"
        and days[0]["stale"]
        and days[0]["total_student_entries"] is None
    )
    assert (
        days[-1]["total_student_entries"] == 24
        and days[-1]["data_status"] == "PROVISIONAL"
    )
    for method, label in [
        ("weekly", site.day - timedelta(days=site.day.weekday())),
        ("monthly", site.day.replace(day=1)),
    ]:
        rows = client.get(ROOT + f"history/{method}/", filters).json()["results"]
        assert rows[-1]["date"] == label.isoformat()
        assert sum(row["total_student_entries"] or 0 for row in rows) == 31
    lunch = client.get(
        ROOT + "history/daily/", {**filters, "meal_type": "LUNCH", "status": "FINISHED"}
    ).json()["results"][-1]
    assert (
        lunch["total_student_entries"] is None and lunch["total_forecast_plates"] == 10
    )
    assert client.get(
        ROOT + "meal-services/", {**filters, "meal_type": "LUNCH"}
    ).json()["results"][0]["id"] == str(meals[0].pk)
    assert (
        client.get(
            ROOT + "history/",
            {"start_date": site.day - timedelta(days=365), "end_date": site.day},
        ).json()["count"]
        == 366
    )
    page = client.get(
        ROOT + "history/",
        {"start_date": site.day - timedelta(days=59), "end_date": site.day},
    ).json()
    assert page["next"] and len(page["results"]) == 50
    for bad in (
        {"start_date": "invalid"},
        {"date": site.day, "start_date": site.day},
        {"start_date": site.day + timedelta(days=1), "end_date": site.day},
        {"start_date": site.day - timedelta(days=366), "end_date": site.day},
    ):
        assert client.get(ROOT + "history/", bad).status_code == 400
    institutional = client.get(
        ROOT + "organizations/summary/", {"date": site.day}
    ).json()
    assert institutional["summary"]["total_student_entries"] == 29
    assert institutional["comparison"]["total_student_entries"] == 22
    assert institutional["service_count_by_type"] == {"LUNCH": 1, "SNACK": 1}
    assert institutional["previous_period"]["start_date"] == earlier.isoformat()
    assert client.get(ROOT + f"daily/{first.pk}/").status_code == 200


def test_tenant_permissions_and_exports(site):
    make_facts(site)
    services.rebuild_daily_metrics(site.school, site.day)
    outside = DailyMetrics.objects.create(
        school=site.foreign, reference_date=site.day, total_student_entries=999
    )
    DailyMetrics.objects.create(
        school=site.branch, reference_date=site.day, total_student_entries=888
    )
    client = api(site.director)
    filters = {"date": site.day, "school": site.school.pk}
    csv_response = client.get(ROOT + "reports/export/", {**filters, "format": "csv"})
    assert csv_response.status_code == 200
    csv_rows = list(csv.DictReader(StringIO(csv_response.content.decode("utf-8-sig"))))
    assert csv_rows[0]["Entradas"] == "24" and csv_rows[0]["Estado"] == "PROVISIONAL"
    assert csv_response["Cache-Control"] == "private, no-store"
    pdf = client.get(ROOT + "reports/export/", {**filters, "file_format": "pdf"})
    assert pdf["Content-Type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF-") and pdf.content.rstrip().endswith(b"%%EOF")
    assert client.get(
        ROOT + "reports/export/",
        {"file_format": "pdf", "date": site.day - timedelta(days=1)},
    ).content.startswith(b"%PDF-")
    assert (
        client.get(
            ROOT + "reports/export/",
            {"start_date": site.day - timedelta(days=90), "end_date": site.day},
        ).status_code
        == 400
    )
    assert AuditLog.objects.filter(action="ANALYTICS_REPORT_EXPORTED").count() == 3
    assert client.get(ROOT + f"daily/{outside.pk}/").status_code == 404
    assert (
        client.get(ROOT + "reports/export/", {"school": site.foreign.pk}).status_code
        == 404
    )
    assert (
        api(site.director, site.foreign.organization)
        .get(ROOT + "dashboard/")
        .status_code
        == 403
    )
    secretary = membership(site.school, "SECRETARIAT")
    restricted = api(secretary)
    assert (
        restricted.get(ROOT + "reports/export/", {"school": site.branch.pk}).status_code
        == 404
    )
    results = restricted.get(ROOT + "schools/comparison/", {"date": site.day}).json()[
        "results"
    ]
    assert [row["school_id"] for row in results] == [str(site.school.pk)]
    assert restricted.post(ROOT + "daily/rebuild/", filters).status_code == 403
    secretary.is_active = False
    secretary.save()
    assert restricted.get(ROOT + "dashboard/").status_code == 403
    teacher = api(membership(site.school, "TEACHER"))
    summary = teacher.get(ROOT + "dashboard/", filters).json()
    assert summary["meal_services"] == [] and summary["total_student_entries"] == 24
    assert summary["total_forecast_plates"] is None and summary["stale"] is None
    assert teacher.get(ROOT + "meal-services/", filters).status_code == 403
    assert teacher.get(ROOT + "reports/export/", filters).status_code == 403
    assert (
        teacher.get(ROOT + "history/", {**filters, "meal_type": "LUNCH"}).status_code
        == 400
    )
    assert (
        api(membership(site.school, "COOK"))
        .get(ROOT + "history/", {"date": site.day - timedelta(days=45)})
        .status_code
        == 400
    )


def test_failed_reconciliation_rolls_back_and_retries(site, monkeypatch):
    make_facts(site)
    mark_dirty([(site.school.pk, site.day)])
    with monkeypatch.context() as patch:

        def fail(*args, **kwargs):
            raise IntegrityError("synthetic test")

        patch.setattr(services, "audit", fail)
        with pytest.raises(IntegrityError):
            services.rebuild_daily_metrics(
                site.school, site.day, actor=site.director.user
            )
    assert not DailyMetrics.objects.exists()
    assert PendingDailyMetrics.objects.filter(
        school=site.school, reference_date=site.day
    ).exists()
    assert services.reconcile_pending(1) == (1, 0)
    assert DailyMetrics.objects.count() == 1
    assert not PendingDailyMetrics.objects.exists()


@pytest.mark.django_db(transaction=True)
def test_postgresql_rebuilds_and_new_event_during_rebuild(site, monkeypatch, settings):
    if connection.vendor != "postgresql":
        pytest.skip("Exige locks por linha do PostgreSQL")
    settings.COUNT_MAX_DELAY_SECONDS = 604800
    _, meals = make_facts(site)
    _, token = change_credential(site.device.pk, site.director.user, "issue")
    gate = Barrier(2)

    def rebuild():
        close_old_connections()
        try:
            gate.wait(timeout=10)
            return services.rebuild_daily_metrics(site.school, site.day).pk
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        builds = [pool.submit(rebuild) for _ in range(2)]
        assert builds[0].result(timeout=15) == builds[1].result(timeout=15)
    assert DailyMetrics.objects.count() == 1

    calculated, queue_reached = Event(), Event()
    calculate, enqueue = services.calculate_daily_metrics, ingestion.mark_dirty

    def calc(*args):
        value = calculate(*args)
        calculated.set()
        assert queue_reached.wait(timeout=10)
        return value

    def queued(keys):
        queue_reached.set()
        enqueue(keys)

    def child(operation):
        close_old_connections()
        try:
            return operation()
        finally:
            close_old_connections()

    def accept():
        assert calculated.wait(timeout=10)
        device = APIClient()
        device.credentials(HTTP_AUTHORIZATION=f"Device {token}")
        return device.post(
            "/api/v1/device/counts/",
            {
                "event_id": "late",
                "camera_id": site.entrance.pk,
                "event_type": "STUDENT_ENTRY",
                "quantity": 5,
                "recorded_at": site.at.isoformat(),
            },
            format="json",
        )

    with monkeypatch.context() as patch, ThreadPoolExecutor(max_workers=2) as pool:
        patch.setattr(services, "calculate_daily_metrics", calc)
        patch.setattr(ingestion, "mark_dirty", queued)
        writer = pool.submit(child, accept)
        reader = pool.submit(
            child, lambda: services.rebuild_daily_metrics(site.school, site.day)
        )
        assert reader.result(timeout=20).total_student_entries == 24
        response = writer.result(timeout=20)
        assert response.status_code == 201, response.data
    assert PendingDailyMetrics.objects.filter(
        school=site.school, reference_date=site.day
    ).exists()
    assert services.reconcile_pending(25) == (1, 0)
    revised = DailyMetrics.objects.get()
    assert revised.total_student_entries == 29 and revised.data_status == "REVISED"
    assert (
        AttendanceSnapshot.objects.get(meal_service=meals[0]).total_student_entries
        == 24
    )


@pytest.mark.django_db(transaction=True)
def test_administrative_adjustment_and_rebuild_share_lock_order(site, monkeypatch):
    if connection.vendor != "postgresql":
        pytest.skip("Exige locks por linha do PostgreSQL")
    entry, _ = make_facts(site)
    services.rebuild_daily_metrics(site.school, site.day)
    writer_locked, rebuild_attempted = Event(), Event()

    def queue(keys):
        writer_locked.set()
        assert rebuild_attempted.wait(timeout=10)
        mark_dirty(keys)

    def observe_lock(execute, sql, params, many, context):
        if "FOR KEY SHARE" in sql:
            rebuild_attempted.set()
        return execute(sql, params, many, context)

    def writer():
        close_old_connections()
        try:
            return api(site.director).post(
                "/api/v1/count-adjustments/",
                {
                    "event_type": "STUDENT_ENTRY",
                    "count_id": entry.pk,
                    "delta": -4,
                    "reason": "Conferência",
                },
                format="json",
            )
        finally:
            close_old_connections()

    def reconcile():
        close_old_connections()
        try:
            assert writer_locked.wait(timeout=10)
            with connection.execute_wrapper(observe_lock):
                return services.rebuild_daily_metrics(
                    site.school, site.day, actor=site.director.user
                )
        finally:
            close_old_connections()

    monkeypatch.setattr(adjustments, "mark_dirty", queue)
    with ThreadPoolExecutor(max_workers=2) as pool:
        write, read = pool.submit(writer), pool.submit(reconcile)
        response = write.result(timeout=20)
        assert response.status_code == 201, response.data
        assert read.result(timeout=20).total_student_entries == 20
    assert not PendingDailyMetrics.objects.exists()


def test_historical_backfill_and_no_data(site):
    api_client = api(site.director)
    assert api_client.get(ROOT + "history/", {"date": "0001-01-01"}).status_code == 400
    output = StringIO()
    call_command(
        "reconcile_daily_metrics",
        "--from",
        str(site.day),
        "--to",
        str(site.day),
        "--school",
        str(site.school.pk),
        "--limit",
        "1",
        stdout=output,
    )
    row = DailyMetrics.objects.get(school=site.school, reference_date=site.day)
    assert not row.has_entries and not row.has_served and not row.has_forecast
    detail = api_client.get(ROOT + f"daily/{row.pk}/").json()
    assert detail["total_student_entries"] is None
    dashboard = api_client.get(
        ROOT + "dashboard/", {"school": site.school.pk, "date": site.day}
    ).json()
    assert dashboard["data_status"] == "NO_DATA" and dashboard["coverage"] == 0


def test_analytics_query_budget_with_raw_volume(site):
    if connection.vendor != "postgresql":
        pytest.skip("Medição executada no PostgreSQL")
    schools = [
        site.branch,
        *School.objects.bulk_create(
            [
                School(organization=site.org, name=f"Unidade {index}", code=f"U{index}")
                for index in range(11)
            ]
        ),
    ]
    DailyMetrics.objects.bulk_create(
        [
            DailyMetrics(
                school=school,
                reference_date=site.day - timedelta(days=offset),
                total_student_entries=10,
                has_entries=True,
            )
            for school in schools
            for offset in range(30)
        ]
    )
    StudentCount.objects.bulk_create(
        [
            StudentCount(
                camera=site.entrance,
                quantity=1,
                recorded_at=site.at,
                external_event_id=f"volume-{index}",
            )
            for index in range(3000)
        ]
    )
    meal = MealService.objects.create(
        school=site.school, date=site.day, meal_type="LUNCH", scheduled_time=time(12)
    )
    PlateCount.objects.bulk_create(
        [
            PlateCount(
                camera=site.cafeteria,
                meal_service=meal,
                quantity=1,
                recorded_at=site.at,
                external_event_id=f"p-{index}",
            )
            for index in range(2000)
        ]
    )
    start = perf_counter()
    with CaptureQueriesContext(connection) as rebuild_queries:
        row = services.rebuild_daily_metrics(site.school, site.day)
    rebuild_ms = (perf_counter() - start) * 1000
    start = perf_counter()
    client = api(site.director)
    with CaptureQueriesContext(connection) as history_queries:
        data = client.get(
            ROOT + "history/daily/",
            {"start_date": site.day - timedelta(days=29), "end_date": site.day},
        ).json()
    history_ms = (perf_counter() - start) * 1000
    assert (
        row.total_student_entries == 3000
        and row.total_served_plates == 2000
        and data["count"] == 30
    )
    assert data["results"][-1]["total_student_entries"] == 3120
    assert len(rebuild_queries) <= 20 and len(history_queries) <= 8
    print(
        f"analytics volume raw_events=5000 projections=361 rebuild_sql={len(rebuild_queries)} rebuild_ms={rebuild_ms:.1f} history_sql={len(history_queries)} history_ms={history_ms:.1f}"
    )
