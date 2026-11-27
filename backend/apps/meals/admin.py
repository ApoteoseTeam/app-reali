from django.contrib import admin

from apps.core.admin import OperationsReadOnlyAdmin
from apps.meals.models import MealService, MealForecast, MealSchedule


@admin.register(MealSchedule)
class MealScheduleAdmin(OperationsReadOnlyAdmin):
    reali_label = "Horários de merenda"
    fields = (
        "name",
        "school",
        "meal_type",
        "start_time",
        "end_time",
        "entry_window_start",
        "weekdays",
        "excluded_dates",
        "is_active",
    )
    list_display = ("name", "school", "meal_type", "start_time", "is_active")
    list_filter = ("meal_type", "is_active")
    search_fields = ("name", "school__name", "school__organization__name")
    list_select_related = ("school",)


@admin.register(MealService)
class MealServiceAdmin(OperationsReadOnlyAdmin):
    reali_label = "Serviços de merenda"
    fields = (
        "school",
        "date",
        "meal_type",
        "status",
        "scheduled_time",
        "scheduled_end_time",
        "preparation_started_at",
        "serving_started_at",
        "finished_at",
        "cancelled_at",
        "serving_data_quality",
    )
    list_display = (
        "date",
        "school",
        "meal_type",
        "status",
        "scheduled_time",
        "serving_data_quality",
    )
    list_filter = (
        "status",
        "meal_type",
        "date",
    )
    search_fields = (
        "school__name",
        "school__organization__name",
    )
    ordering = (
        "-date",
        "-scheduled_time",
    )
    list_select_related = ("school",)


@admin.register(MealForecast)
class MealForecastAdmin(OperationsReadOnlyAdmin):
    reali_label = "Previsões de merenda"
    fields = (
        "meal_service",
        "forecast_plates",
        "estimated_plates_per_entry",
        "confidence_status",
        "method",
        "algorithm_version",
        "created_at",
    )
    list_display = (
        "meal_service",
        "forecast_plates",
        "confidence_status",
        "method",
        "created_at",
    )
    list_filter = (
        "confidence_status",
        "method",
        "created_at",
    )
    search_fields = (
        "meal_service__school__name",
        "meal_service__school__organization__name",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "meal_service",
        "meal_service__school",
    )
