from django.contrib import admin
from django.utils import timezone

from apps.core.admin import OperationsReadOnlyAdmin
from apps.api.models import InstitutionRequest, UserInvitation, AuditLog


@admin.register(InstitutionRequest)
class InstitutionRequestAdmin(OperationsReadOnlyAdmin):
    reali_label = "Solicitações de instituição"
    fields = (
        "organization_name",
        "contact_name",
        "contact_email",
        "phone",
        "message",
        "status",
        "reviewed_at",
        "reviewed_by",
        "rejection_reason",
        "organization",
        "created_at",
    )
    list_display = (
        "organization_name",
        "contact_email",
        "status",
        "created_at",
        "reviewed_at",
    )
    list_filter = ("status",)
    search_fields = (
        "organization_name",
        "contact_name",
        "contact_email",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "reviewed_by",
        "organization",
    )


@admin.register(UserInvitation)
class UserInvitationAdmin(OperationsReadOnlyAdmin):
    reali_label = "Convites"
    fields = (
        "organization",
        "email",
        "role",
        "status",
        "delivery_status",
        "all_schools_access",
        "schools",
        "invited_by",
        "expires_at",
        "accepted_at",
        "revoked_at",
        "last_sent_at",
        "created_at",
    )
    list_display = (
        "email",
        "organization",
        "role",
        "current_status",
        "delivery_status",
        "expires_at",
    )
    list_filter = (
        "status",
        "delivery_status",
        "role",
    )
    search_fields = (
        "email",
        "organization__name",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "organization",
        "invited_by",
    )

    @admin.display(description="Situação")
    def current_status(self, obj):
        if (
            obj.status == UserInvitation.Status.PENDING
            and obj.expires_at <= timezone.now()
        ):
            return UserInvitation.Status.EXPIRED.label
        return obj.get_status_display()


@admin.register(AuditLog)
class AuditLogAdmin(OperationsReadOnlyAdmin):
    reali_label = "Trilha de auditoria"
    fields = (
        "created_at",
        "action",
        "actor",
        "organization",
        "school",
        "target_type",
        "object_id",
        "request_id",
    )
    list_display = (
        "created_at",
        "action",
        "actor",
        "organization",
        "school",
        "target_type",
        "object_id",
    )
    list_filter = (
        "target_type",
        "created_at",
    )
    search_fields = (
        "action",
        "actor__email",
        "organization__name",
        "object_id",
        "=request_id",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "actor",
        "organization",
        "school",
    )
