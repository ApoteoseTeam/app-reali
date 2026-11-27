from django.contrib import admin

from apps.core.admin import OperationsReadOnlyAdmin
from apps.analytics.models import DailyMetrics


@admin.register(DailyMetrics)
class DailyMetricsAdmin(OperationsReadOnlyAdmin):
    reali_label = "Indicadores diários"
    fields = (
        "school",
        "reference_date",
        "total_student_entries",
        "total_forecast_plates",
        "total_served_plates",
        "calculated_at",
        "data_status",
        "is_complete",
        "has_entries",
        "has_forecast",
        "has_served",
        "compared_services",
        "eligible_services",
    )
    list_display = (
        "reference_date",
        "school",
        "total_student_entries",
        "total_forecast_plates",
        "total_served_plates",
        "data_status",
    )
    list_filter = (
        "data_status",
        "reference_date",
    )
    search_fields = (
        "school__name",
        "school__organization__name",
    )
    ordering = ("-reference_date",)
    list_select_related = ("school",)
