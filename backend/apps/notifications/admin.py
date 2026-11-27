from django.contrib import admin

from apps.core.admin import OperationsReadOnlyAdmin
from apps.notifications.models import AlertIncident, NotificationDelivery


@admin.register(AlertIncident)
class AlertIncidentAdmin(OperationsReadOnlyAdmin):
    reali_label = "Incidentes operacionais"
    fields = (
        "source",
        "source_id",
        "condition",
        "opened_at",
        "noticed",
        "escalated",
        "updated_at",
    )
    list_display = (
        "source",
        "source_id",
        "condition",
        "opened_at",
        "escalated",
    )
    list_filter = (
        "source",
        "condition",
        "escalated",
    )
    search_fields = ("=source_id",)
    ordering = ("-updated_at",)


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(OperationsReadOnlyAdmin):
    reali_label = "Entregas de notificações"
    fields = (
        "notification_kind",
        "organization",
        "school",
        "channel",
        "status",
        "attempt_count",
        "receipt_attempt_count",
        "next_attempt_at",
        "accepted_at",
        "last_error_code",
        "created_at",
    )
    list_display = (
        "created_at",
        "notification_kind",
        "organization",
        "channel",
        "status",
        "attempt_count",
        "last_error_code",
    )
    list_filter = (
        "channel",
        "status",
        "created_at",
    )
    search_fields = (
        "notification__organization__name",
        "notification__school__name",
        "last_error_code",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "notification",
        "notification__organization",
        "notification__school",
    )

    @admin.display(description="Tipo de notificação")
    def notification_kind(self, obj):
        return obj.notification.get_kind_display()

    @admin.display(
        description="Instituição", ordering="notification__organization__name"
    )
    def organization(self, obj):
        return obj.notification.organization

    @admin.display(description="Escola")
    def school(self, obj):
        return obj.notification.school
