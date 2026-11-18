from decimal import Decimal

from rest_framework import serializers
from apps.users.models import User, Membership
from apps.institutions.models import Organization, School
from apps.cameras.models import Camera
from apps.counting.models import StudentCount, PlateCount
from apps.meals.models import MealService, AttendanceSnapshot, MealForecast
from apps.analytics.models import DailyMetrics
from .models import InstitutionRequest


def validate_uuid(name, value):
    try:
        return serializers.UUIDField().run_validation(value)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({name: exc.detail}) from exc


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name")


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "user", "organization", "role", "is_active")
        read_only_fields = fields


class InstitutionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionRequest
        fields = (
            "id",
            "organization_name",
            "contact_name",
            "contact_email",
            "phone",
            "message",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "status", "created_at")


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "is_active")
        read_only_fields = fields


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = (
            "id",
            "organization",
            "name",
            "code",
            "address",
            "city",
            "state",
            "zip_code",
            "is_active",
        )
        read_only_fields = ("id", "organization")

    def validate_code(self, code):
        membership = self.context["membership"]
        schools = School.objects.filter(
            organization_id=membership.organization_id, code=code
        )
        if self.instance:
            schools = schools.exclude(pk=self.instance.pk)
        if schools.exists():
            raise serializers.ValidationError(
                "Já existe uma escola com este código na organização."
            )
        return code


class CameraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camera
        fields = (
            "id",
            "school",
            "name",
            "camera_type",
            "location",
            "is_active",
            "last_seen_at",
        )
        read_only_fields = ("id", "last_seen_at")


class StudentCountSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentCount
        fields = (
            "id",
            "camera",
            "quantity",
            "recorded_at",
            "source",
            "external_event_id",
            "created_at",
        )
        read_only_fields = fields


class PlateCountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlateCount
        fields = (
            "id",
            "camera",
            "meal_service",
            "quantity",
            "recorded_at",
            "source",
            "external_event_id",
            "created_at",
        )
        read_only_fields = fields


class MealServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealService
        fields = (
            "id",
            "school",
            "date",
            "meal_type",
            "scheduled_time",
            "status",
            "preparation_started_at",
            "serving_started_at",
            "finished_at",
        )
        read_only_fields = (
            "id",
            "status",
            "preparation_started_at",
            "serving_started_at",
            "finished_at",
        )


class SnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSnapshot
        fields = ("id", "meal_service", "reference_time", "total_student_entries")
        read_only_fields = fields


class ForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealForecast
        fields = (
            "id",
            "meal_service",
            "attendance_snapshot",
            "forecast_plates",
            "estimated_plates_per_entry",
        )
        read_only_fields = fields


class DailyMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetrics
        fields = (
            "id",
            "school",
            "reference_date",
            "total_student_entries",
            "total_forecast_plates",
            "total_served_plates",
            "calculated_at",
        )
        read_only_fields = fields


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices)


class InvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    full_name = serializers.CharField(max_length=160)
    password = serializers.CharField(
        write_only=True, min_length=12, trim_whitespace=False
    )

    def validate_password(self, password):
        from django.contrib.auth.password_validation import validate_password

        validate_password(password)
        return password


class DeviceEventSerializer(serializers.Serializer):
    event_id = serializers.CharField(max_length=120)
    recorded_at = serializers.DateTimeField()
    quantity = serializers.IntegerField(min_value=1, max_value=100000)
    meal_service = serializers.UUIDField(required=False)


class StartMealSerializer(serializers.Serializer):
    estimated_plates_per_entry = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        min_value=Decimal(0),
        max_value=Decimal(5),
        default=Decimal("1.000"),
    )


class RebuildMetricsSerializer(serializers.Serializer):
    school = serializers.UUIDField()
    date = serializers.DateField()
