from rest_framework import serializers
from apps.users.models import User, Membership
from apps.institutions.models import Organization, School
from apps.counting.models import StudentCount, PlateCount
from apps.meals.models import MealService
from .models import InstitutionRequest
from .permissions import schools_for

INSTITUTION_STATUS_CHOICES = InstitutionRequest.Status.choices
MEAL_STATUS_CHOICES = MealService.Status.choices


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
        fields = (
            "id",
            "user",
            "organization",
            "role",
            "is_active",
            "all_schools_access",
        )
        read_only_fields = fields


class InstitutionRequestSerializer(serializers.ModelSerializer):
    message = serializers.CharField(max_length=4000, allow_blank=True, required=False)

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


class ActiveSchoolField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        if "authorized_schools" in self.context:
            return self.context["authorized_schools"].filter(is_active=True)
        membership = self.context.get("membership")
        if membership is None:
            return School.objects.none()
        return schools_for(membership, active_only=True)


class StudentCountSerializer(serializers.ModelSerializer):
    received_at = serializers.DateTimeField(read_only=True)

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
            "received_at",
        )
        read_only_fields = fields


class PlateCountSerializer(serializers.ModelSerializer):
    received_at = serializers.DateTimeField(read_only=True)

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
            "received_at",
        )
        read_only_fields = fields


class DeviceEventSerializer(serializers.Serializer):
    event_id = serializers.CharField(max_length=120)
    recorded_at = serializers.DateTimeField()
    quantity = serializers.IntegerField(min_value=1, max_value=100000)
    meal_service = serializers.UUIDField(required=False)
