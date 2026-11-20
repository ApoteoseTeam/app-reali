"""Seed the isolated PostgreSQL database used only for the mobile integration checks."""

import os
from datetime import UTC, timedelta
from decimal import Decimal

from apps.analytics.services import rebuild_daily_metrics
from apps.cameras.models import Camera
from apps.counting.models import PlateCount, StudentCount
from apps.institutions.models import Organization, School
from apps.meals.models import MealForecastPolicy, MealService
from apps.users.models import Membership, User
from django.conf import settings
from django.db import transaction
from django.utils import timezone

db = settings.DATABASES["default"]
if db["HOST"] not in {"127.0.0.1", "localhost"} or not db["NAME"].startswith(
    "reali_phase8"
):
    raise RuntimeError(
        "Use um banco PostgreSQL local e isolado com prefixo reali_phase8."
    )

with transaction.atomic():
    user = User.objects.create_user(
        "mobile-smoke@example.test",
        os.environ["REALI_SMOKE_PASSWORD"],
        full_name="Direção Mobile",
    )
    org = Organization.objects.create(name="Rede Mobile")
    school = School.objects.create(name="Escola Mobile", code="M", organization=org)
    outside = Organization.objects.create(name="Rede Isolada")
    Membership.objects.create(
        user=user, organization=org, role="DIRECTOR", all_schools_access=True
    )
    entrance = Camera.objects.create(
        school=school, name="Portaria Mobile", camera_type="ENTRANCE"
    )
    cafeteria = Camera.objects.create(
        school=school, name="Cantina Mobile", camera_type="CAFETERIA"
    )
    day = timezone.localdate()
    yesterday = day - timedelta(days=1)
    at = timezone.localtime()
    recorded = at - timedelta(seconds=10) if at.second >= 10 else at
    if recorded.date() != day:
        recorded = at
    StudentCount.objects.create(
        camera=entrance,
        recorded_at=recorded,
        quantity=25,
        external_event_id="mobile-entry",
    )
    prior_meal = MealService.objects.create(
        school=school,
        date=yesterday,
        meal_type="LUNCH",
        scheduled_time="12:00",
        status="FINISHED",
    )
    PlateCount.objects.create(
        camera=cafeteria,
        meal_service=prior_meal,
        recorded_at=(at - timedelta(days=1)).astimezone(UTC),
        quantity=19,
        external_event_id="mobile-plate",
    )
    MealService.objects.create(
        school=school, date=day, meal_type="LUNCH", scheduled_time="12:00"
    )
    MealForecastPolicy.objects.create(
        school=school, meal_type="LUNCH", initial_rate=Decimal("0.8")
    )
    rebuild_daily_metrics(school, day)
    rebuild_daily_metrics(school, yesterday)
print(f"Dados sintéticos preparados. Organização externa {outside.pk}")
