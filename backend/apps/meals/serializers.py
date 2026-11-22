from decimal import Decimal

from rest_framework import serializers

from apps.api.serializers import ActiveSchoolField

from .models import (
    AttendanceSnapshot,
    MealForecast,
    MealForecastPolicy,
    MealSchedule,
    MealService,
)


class MealServiceSerializer(serializers.ModelSerializer):
    school = ActiveSchoolField()

    class Meta:
        model = MealService
        fields = (
            "id",
            "school",
            "date",
            "meal_type",
            "scheduled_time",
            "scheduled_end_time",
            "entry_window_start",
            "schedule",
            "history_excluded",
            "status",
            "preparation_started_at",
            "serving_started_at",
            "finished_at",
            "cancelled_at",
            "cancellation_reason",
            "serving_data_quality",
            "created_by",
            "preparation_started_by",
            "serving_started_by",
            "finished_by",
            "cancelled_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "schedule",
            "status",
            "preparation_started_at",
            "serving_started_at",
            "finished_at",
            "cancelled_at",
            "cancellation_reason",
            "serving_data_quality",
            "created_by",
            "preparation_started_by",
            "serving_started_by",
            "finished_by",
            "cancelled_by",
            "created_at",
            "updated_at",
        )
        # The domain service validates exact slots and overlap under the organization lock.
        validators = []


class SnapshotSerializer(serializers.ModelSerializer):
    cutoff_at = serializers.DateTimeField(source="reference_time", read_only=True)
    metadata = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSnapshot
        fields = (
            "id",
            "meal_service",
            "reference_time",
            "cutoff_at",
            "window_start_at",
            "window_end_at",
            "total_student_entries",
            "last_source_event_at",
            "data_quality_status",
            "metadata",
            "created_by",
            "created_at",
        )
        read_only_fields = fields

    def get_metadata(self, snapshot) -> dict:
        return {
            key: value for key, value in snapshot.metadata.items() if key != "cameras"
        }


class ForecastSerializer(serializers.ModelSerializer):
    predicted_plates = serializers.IntegerField(
        source="forecast_plates", allow_null=True, read_only=True
    )
    conversion_rate = serializers.DecimalField(
        source="estimated_plates_per_entry",
        max_digits=6,
        decimal_places=3,
        allow_null=True,
        read_only=True,
    )
    calculated_at = serializers.DateTimeField(source="created_at", read_only=True)
    parameters = serializers.SerializerMethodField()

    class Meta:
        model = MealForecast
        fields = (
            "id",
            "meal_service",
            "attendance_snapshot",
            "forecast_plates",
            "estimated_plates_per_entry",
            "predicted_plates",
            "conversion_rate",
            "method",
            "confidence_status",
            "algorithm_version",
            "calculated_at",
            "parameters",
        )
        read_only_fields = fields

    def get_parameters(self, forecast) -> dict:
        if self.context.get("limited_history"):
            return {
                **{
                    key: value
                    for key, value in forecast.parameters.items()
                    if key not in {"samples", "policy_id"}
                },
                "sample_count": len(forecast.parameters.get("samples", [])),
            }
        return forecast.parameters


class StartedMealSerializer(MealServiceSerializer):
    meal_service_id = serializers.UUIDField(source="id", read_only=True)
    attendance_snapshot = SnapshotSerializer(read_only=True)
    forecast = ForecastSerializer(read_only=True)

    class Meta(MealServiceSerializer.Meta):
        fields = MealServiceSerializer.Meta.fields + (
            "meal_service_id",
            "attendance_snapshot",
            "forecast",
        )


class StartMealSerializer(serializers.Serializer):
    estimated_plates_per_entry = serializers.DecimalField(
        max_digits=6,
        decimal_places=3,
        min_value=Decimal("0"),
        max_value=Decimal("5"),
        required=False,
    )


class CancelMealSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)


class ScheduleSerializer(serializers.ModelSerializer):
    school = ActiveSchoolField()
    weekdays = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=7),
        allow_empty=False,
        max_length=7,
    )
    excluded_dates = serializers.ListField(
        child=serializers.DateField(), max_length=366, required=False
    )

    class Meta:
        model = MealSchedule
        fields = (
            "id",
            "school",
            "meal_type",
            "name",
            "start_time",
            "end_time",
            "entry_window_start",
            "weekdays",
            "excluded_dates",
            "is_active",
        )
        read_only_fields = ("id",)

    def validate_weekdays(self, weekdays):
        if len(weekdays) != len(set(weekdays)):
            raise serializers.ValidationError("Use dias da semana distintos.")
        return sorted(weekdays)

    def validate_excluded_dates(self, dates):
        if len(dates) != len(set(dates)):
            raise serializers.ValidationError("Use datas distintas.")
        return sorted(day.isoformat() for day in dates)


class GenerateScheduleSerializer(serializers.Serializer):
    date = serializers.DateField()


class ForecastPolicySerializer(serializers.ModelSerializer):
    school = ActiveSchoolField()

    class Meta:
        model = MealForecastPolicy
        fields = (
            "id",
            "school",
            "meal_type",
            "initial_rate",
            "minimum_history",
            "history_days",
        )
        read_only_fields = ("id",)
        validators = []


class ScheduleFilters(serializers.Serializer):
    school = serializers.UUIDField(required=False)
    meal_type = serializers.ChoiceField(
        choices=MealService.MealType.choices, required=False
    )


class ServiceFilters(ScheduleFilters):
    date = serializers.DateField(required=False)
    status = serializers.ChoiceField(choices=MealService.Status.choices, required=False)
