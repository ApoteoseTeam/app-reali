from django.contrib import admin

from apps.core.admin import OperationsReadOnlyAdmin
from apps.counting.models import (
    CameraCountActivity,
    CountAdjustment,
    PlateCount,
    StudentCount,
)


class RecordedCountAdmin(OperationsReadOnlyAdmin):
    fields = ("camera", "quantity", "source", "recorded_at", "created_at")
    list_display = ("recorded_at", "camera", "quantity", "source")
    list_filter = ("source", "recorded_at")
    search_fields = (
        "camera__name",
        "camera__school__name",
        "camera__school__organization__name",
    )
    ordering = ("-recorded_at",)
    list_select_related = ("camera", "camera__school")


@admin.register(StudentCount)
class StudentCountAdmin(RecordedCountAdmin):
    reali_label = "Contagens de entradas"


@admin.register(PlateCount)
class PlateCountAdmin(RecordedCountAdmin):
    reali_label = "Contagens de pratos"
    fields = (*RecordedCountAdmin.fields, "meal_service")


@admin.register(CameraCountActivity)
class CameraCountActivityAdmin(OperationsReadOnlyAdmin):
    reali_label = "Sincronização de contagens"
    fields = (
        "camera",
        "processed",
        "duplicates",
        "rejected",
        "last_received_at",
        "last_recorded_at",
    )
    list_display = (
        "camera",
        "processed",
        "duplicates",
        "rejected",
        "last_received_at",
    )
    list_filter = ("last_received_at",)
    search_fields = (
        "camera__name",
        "camera__school__name",
        "camera__school__organization__name",
    )
    ordering = ("-last_received_at",)
    list_select_related = (
        "camera",
        "camera__school",
    )


@admin.register(CountAdjustment)
class CountAdjustmentAdmin(OperationsReadOnlyAdmin):
    reali_label = "Ajustes de contagem"
    fields = (
        "school",
        "camera",
        "event_type",
        "meal_service",
        "delta",
        "reason",
        "recorded_at",
        "actor",
        "reversal_of",
    )
    list_display = (
        "recorded_at",
        "school",
        "event_type",
        "delta",
        "actor",
    )
    list_filter = (
        "event_type",
        "recorded_at",
    )
    search_fields = (
        "school__name",
        "school__organization__name",
        "camera__name",
        "actor__email",
    )
    ordering = ("-recorded_at",)
    list_select_related = (
        "school",
        "camera",
        "meal_service",
        "meal_service__school",
        "actor",
        "reversal_of",
    )
