from datetime import date

from rest_framework import serializers

from apps.meals.models import MealService

from .selectors import errors, performance


class DateFilters(serializers.Serializer):
    school = serializers.UUIDField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    date = serializers.DateField(required=False)


class PeriodSerializer(DateFilters):
    meal_type = serializers.ChoiceField(
        choices=MealService.MealType.choices, required=False
    )
    status = serializers.ChoiceField(choices=MealService.Status.choices, required=False)


class HistoryFilters(PeriodSerializer):
    group = serializers.ChoiceField(
        choices=("daily", "weekly", "monthly"), required=False
    )


class ExportFilters(HistoryFilters):
    file_format = serializers.ChoiceField(choices=("csv", "pdf"), required=False)


class RebuildMetricsSerializer(serializers.Serializer):
    school = serializers.UUIDField()
    date = serializers.DateField()

    def validate_date(self, value):
        if value < date(1900, 1, 1):
            raise serializers.ValidationError("Informe uma data a partir de 1900.")
        return value


class ErrorFields(serializers.Serializer):
    forecast_difference = serializers.IntegerField(allow_null=True)
    absolute_error = serializers.IntegerField(allow_null=True)
    percentage_error = serializers.DecimalField(
        max_digits=32, decimal_places=2, allow_null=True
    )
    percentage_error_reason = serializers.CharField(allow_null=True)


class PerformanceFields(serializers.Serializer):
    compared_services = serializers.IntegerField()
    sum_absolute_error = serializers.IntegerField(allow_null=True)
    mae = serializers.DecimalField(max_digits=32, decimal_places=2, allow_null=True)
    wape = serializers.DecimalField(max_digits=32, decimal_places=2, allow_null=True)
    wape_reason = serializers.CharField(allow_null=True)


class MetricValues(ErrorFields, PerformanceFields):
    total_student_entries = serializers.IntegerField(allow_null=True)
    total_forecast_plates = serializers.IntegerField(allow_null=True)
    total_served_plates = serializers.IntegerField(allow_null=True)
    coverage = serializers.IntegerField()
    expected = serializers.IntegerField()
    data_status = serializers.CharField(allow_null=True)
    calculated_at = serializers.DateTimeField(allow_null=True)
    stale = serializers.BooleanField(allow_null=True)
    date = serializers.DateField(required=False)
    school_id = serializers.UUIDField(required=False, allow_null=True)


class DailyMetricsSerializer(ErrorFields, PerformanceFields):
    id = serializers.UUIDField()
    school = serializers.UUIDField()
    reference_date = serializers.DateField()
    total_student_entries = serializers.IntegerField(allow_null=True)
    total_forecast_plates = serializers.IntegerField(allow_null=True)
    total_served_plates = serializers.IntegerField(allow_null=True)
    calculated_at = serializers.DateTimeField(allow_null=True)
    data_status = serializers.CharField(allow_null=True)
    is_complete = serializers.BooleanField(allow_null=True)
    stale = serializers.BooleanField(allow_null=True)

    def to_representation(self, row):
        entry_only = self.context.get("entry_only")
        predicted = (
            row.total_forecast_plates
            if row.has_forecast is not False and not entry_only
            else None
        )
        served = (
            row.total_served_plates
            if row.has_served is not False and not entry_only
            else None
        )
        return super().to_representation(
            {
                "id": row.pk,
                "school": row.school_id,
                "reference_date": row.reference_date,
                "total_student_entries": row.total_student_entries
                if row.has_entries is not False
                else None,
                "total_forecast_plates": predicted,
                "total_served_plates": served,
                "data_status": None if entry_only else row.data_status,
                "is_complete": None
                if entry_only
                else row.is_complete and not getattr(row, "stale", False),
                "calculated_at": None if entry_only else row.calculated_at,
                "stale": None if entry_only else getattr(row, "stale", False),
                **errors(predicted, served),
                **performance(
                    0 if entry_only else row.compared_services,
                    row.sum_absolute_error,
                    row.compared_served,
                ),
            }
        )


class MealMetricsSerializer(ErrorFields):
    id = serializers.UUIDField()
    school_id = serializers.UUIDField()
    reference_date = serializers.DateField()
    meal_type = serializers.CharField()
    status = serializers.CharField()
    preparation_started_at = serializers.DateTimeField(allow_null=True)
    serving_started_at = serializers.DateTimeField(allow_null=True)
    finished_at = serializers.DateTimeField(allow_null=True)
    snapshot_entries = serializers.IntegerField(allow_null=True)
    total_forecast_plates = serializers.IntegerField(allow_null=True)
    total_served_plates = serializers.IntegerField(allow_null=True)
    forecast_method = serializers.CharField(allow_null=True)
    data_quality = serializers.CharField()
    comparison_eligible = serializers.BooleanField()


class DashboardSerializer(MetricValues):
    reference_date = serializers.DateField()
    meal_services = MealMetricsSerializer(many=True)
    meal_services_truncated = serializers.BooleanField()


class PeriodDates(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class PeriodSummarySerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    period = PeriodDates()
    previous_period = PeriodDates()
    service_count_by_type = serializers.DictField(child=serializers.IntegerField())
    summary = MetricValues()
    previous = MetricValues(allow_null=True)
    comparison = serializers.DictField(child=serializers.IntegerField(allow_null=True))
