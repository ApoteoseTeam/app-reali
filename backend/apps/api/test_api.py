from datetime import timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cameras.models import Camera
from apps.counting.models import PlateCount, StudentCount
from apps.institutions.models import Organization, School
from apps.meals.models import MealForecast, MealService
from apps.users.models import Membership, User

from .models import CameraCredential, UserInvitation


class ApiRegressionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="Rede A")
        cls.other_org = Organization.objects.create(name="Rede B")
        cls.school = School.objects.create(
            organization=cls.org, code="A", name="Escola A"
        )
        cls.other_school = School.objects.create(
            organization=cls.other_org, code="B", name="Escola B"
        )
        cls.user = User.objects.create_user(
            "admin@example.com", "Long-test-password-572!", full_name="Admin"
        )
        cls.membership = Membership.objects.create(
            user=cls.user,
            organization=cls.org,
            role=Membership.Role.DIRECTOR,
            all_schools_access=True,
        )
        cls.camera = Camera.objects.create(
            school=cls.school, name="Cantina", camera_type=Camera.CameraType.CAFETERIA
        )
        cls.key, digest = CameraCredential.generate_secret()
        CameraCredential.objects.create(camera=cls.camera, secret_hash=digest)
        cls.meal = MealService.objects.create(
            school=cls.school,
            date=timezone.localdate(),
            scheduled_time="12:00",
            meal_type=MealService.MealType.LUNCH,
            status=MealService.Status.SERVING,
        )

    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.api.credentials(HTTP_X_ORGANIZATION_ID=str(self.org.pk))
        self.device = APIClient()
        self.device.credentials(
            HTTP_X_CAMERA_ID=str(self.camera.pk), HTTP_X_CAMERA_KEY=self.key
        )

    def test_tenant_and_role_boundaries(self):
        foreign_client = APIClient()
        foreign_client.force_authenticate(self.user)
        self.assertEqual(
            self.api.get(f"/api/v1/schools/{self.other_school.pk}/").status_code, 404
        )
        self.assertEqual(
            foreign_client.get(
                "/api/v1/schools/", HTTP_X_ORGANIZATION_ID=str(self.other_org.pk)
            ).status_code,
            403,
        )
        self.assertEqual(self.api.get("/api/v1/schools/").data["count"], 1)
        self.membership.role = Membership.Role.COOK
        self.membership.save()
        self.assertEqual(
            self.api.patch(
                f"/api/v1/schools/{self.school.pk}/", {"name": "Outra"}
            ).status_code,
            403,
        )
        self.membership.is_active = False
        self.membership.save()
        self.assertEqual(self.api.get("/api/v1/schools/").status_code, 403)

    def test_input_validation_and_school_uniqueness(self):
        invalid_client = APIClient()
        invalid_client.force_authenticate(self.user)
        self.assertEqual(
            invalid_client.get(
                "/api/v1/schools/", HTTP_X_ORGANIZATION_ID="invalid"
            ).status_code,
            400,
        )
        self.assertEqual(self.api.get("/api/v1/schools/invalid/").status_code, 404)
        self.assertEqual(
            self.api.get("/api/v1/student-counts/?school=invalid").status_code, 400
        )
        self.assertEqual(
            self.api.post(
                "/api/v1/analytics/rebuild/",
                {"date": "2026-02-30", "school": "invalid"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.api.post(
                "/api/v1/schools/", {"name": "Outra", "code": "A"}
            ).status_code,
            400,
        )

    def test_jwt_login_rotation_and_inactive_user(self):
        client = APIClient()
        self.assertEqual(client.get("/api/v1/auth/me/").status_code, 401)
        credentials = {"email": self.user.email, "password": "Long-test-password-572!"}
        tokens = client.post("/api/v1/auth/login/", credentials)
        self.assertEqual(tokens.status_code, 200)
        refresh = tokens.data["refresh"]
        self.assertEqual(
            client.post("/api/v1/auth/refresh/", {"refresh": refresh}).status_code, 200
        )
        self.assertEqual(
            client.post("/api/v1/auth/refresh/", {"refresh": refresh}).status_code, 401
        )
        self.user.is_active = False
        self.user.save()
        self.assertEqual(
            client.post("/api/v1/auth/login/", credentials).status_code, 401
        )
        self.assertEqual(
            client.get(
                "/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {tokens.data['access']}"
            ).status_code,
            401,
        )

    def test_device_retries_after_finish_and_immutable_camera_history(self):
        payload = {
            "event_id": "plate-1",
            "recorded_at": timezone.now().isoformat(),
            "quantity": 2,
            "meal_service": str(self.meal.pk),
        }
        url = "/api/v1/device/counts/"
        self.assertEqual(
            APIClient()
            .post(url, payload, HTTP_X_CAMERA_ID="invalid", HTTP_X_CAMERA_KEY=self.key)
            .status_code,
            403,
        )
        first = self.device.post(url, payload)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(
            self.api.post(f"/api/v1/meal-services/{self.meal.pk}/finish/").status_code,
            200,
        )
        retry = self.device.post(url, payload)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.data, {"id": first.data["id"], "created": False})
        self.assertEqual(
            self.device.post(url, {**payload, "quantity": 3}).status_code, 400
        )
        self.assertEqual(
            self.device.post(
                url, {**payload, "meal_service": str(self.school.pk)}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.api.patch(
                f"/api/v1/cameras/{self.camera.pk}/", {"camera_type": "ENTRANCE"}
            ).status_code,
            400,
        )
        self.assertEqual(PlateCount.objects.count(), 1)
        row = PlateCount.objects.get()
        row.pk = None
        with self.assertRaises(IntegrityError), transaction.atomic():
            PlateCount.objects.bulk_create([row])

    def test_default_forecast_uses_only_entries_from_service_day(self):
        camera = Camera.objects.create(
            school=self.school, name="Entrada", camera_type=Camera.CameraType.ENTRANCE
        )
        yesterday = timezone.localdate() - timedelta(days=1)
        self.meal.date = yesterday
        self.meal.status = MealService.Status.PLANNED
        self.meal.save()
        StudentCount.objects.create(
            camera=camera,
            quantity=10,
            recorded_at=timezone.now(),
            external_event_id="today",
        )
        with self.assertRaises(ValidationError):
            StudentCount.objects.create(
                camera=camera,
                quantity=0,
                recorded_at=timezone.now(),
                external_event_id="zero",
            )
        response = self.api.post(
            f"/api/v1/meal-services/{self.meal.pk}/start/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.meal.attendance_snapshot.total_student_entries, 0)
        self.assertIsNone(self.meal.forecast.forecast_plates)
        self.assertEqual(self.meal.forecast.method, MealForecast.Method.UNAVAILABLE)

    def test_invitation_single_use_and_inactive_organization(self):
        raw, digest = UserInvitation.generate_token()
        invitation = UserInvitation.objects.create(
            organization=self.org,
            email="cook@example.com",
            role=Membership.Role.COOK,
            token_hash=digest,
            expires_at=timezone.now() + timedelta(hours=1),
            invited_by=self.user,
        )
        invitation.schools.add(self.school)
        self.org.is_active = False
        self.org.save()
        payload = {
            "token": raw,
            "full_name": "Maria",
            "password": "Long-test-password-184!",
        }
        client = APIClient()
        url = "/api/v1/auth/activate/"
        self.assertEqual(client.post(url, payload).status_code, 400)
        self.org.is_active = True
        self.org.save()
        self.assertEqual(client.post(url, payload).status_code, 200)
        self.assertEqual(client.post(url, payload).status_code, 400)
