from django.contrib import admin
from django.utils import timezone

from apps.cameras.monitoring import agent_status, operational_status

from apps.core.admin import OperationsReadOnlyAdmin
from apps.cameras.models import EdgeDevice, Camera, CameraHealthEvent


@admin.register(EdgeDevice)
class EdgeDeviceAdmin(OperationsReadOnlyAdmin):
    reali_label = "Agentes de visão"
    fields = (
        "name",
        "school",
        "device_identifier",
        "is_active",
        "connection_status",
        "last_seen_at",
        "last_observed_at",
        "agent_version",
    )
    list_display = (
        "name",
        "school",
        "is_active",
        "connection_status",
        "last_seen_at",
        "agent_version",
    )
    list_filter = ("is_active",)
    search_fields = (
        "name",
        "school__name",
        "school__organization__name",
        "=device_identifier",
    )
    ordering = ("-last_seen_at",)
    list_select_related = (
        "school",
        "school__organization",
    )

    @admin.display(description="Conexão")
    def connection_status(self, obj):
        return agent_status(obj, timezone.now())


@admin.register(Camera)
class CameraAdmin(OperationsReadOnlyAdmin):
    reali_label = "Câmeras"
    fields = (
        "name",
        "school",
        "edge_device",
        "camera_type",
        "location",
        "is_active",
        "current_status",
        "last_seen_at",
        "video_status",
        "detector_status",
        "processing_fps",
        "pending_events",
        "telemetry_reason",
    )
    list_display = (
        "name",
        "school",
        "camera_type",
        "current_status",
        "last_seen_at",
        "pending_events",
    )
    list_filter = (
        "is_active",
        "camera_type",
    )
    search_fields = (
        "name",
        "school__name",
        "school__organization__name",
        "edge_device__name",
    )
    ordering = ("name",)
    list_select_related = (
        "school",
        "school__organization",
        "edge_device",
    )

    @admin.display(description="Estado operacional")
    def current_status(self, obj):
        return operational_status(obj, timezone.now()).label


@admin.register(CameraHealthEvent)
class CameraHealthEventAdmin(OperationsReadOnlyAdmin):
    reali_label = "Histórico de saúde das câmeras"
    fields = (
        "camera",
        "occurred_at",
        "event_type",
        "previous_status",
        "new_status",
        "message",
    )
    list_display = (
        "occurred_at",
        "camera",
        "event_type",
        "previous_status",
        "new_status",
    )
    list_filter = (
        "new_status",
        "occurred_at",
    )
    search_fields = (
        "camera__name",
        "camera__school__name",
        "camera__school__organization__name",
    )
    ordering = ("-occurred_at",)
    list_select_related = (
        "camera",
        "camera__school",
    )
