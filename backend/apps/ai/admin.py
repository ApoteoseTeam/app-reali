from django.contrib import admin

from apps.core.admin import OperationsReadOnlyAdmin
from apps.ai.models import AIExecution


@admin.register(AIExecution)
class AIExecutionAdmin(OperationsReadOnlyAdmin):
    reali_label = "Execuções do RealInova"
    fields = (
        "organization",
        "usage_day",
        "status",
        "attempted_models",
        "input_tokens",
        "output_tokens",
        "token_usage_complete",
        "charged_microusd",
        "latency_ms",
        "error_code",
        "completed_at",
    )
    list_display = (
        "created_at",
        "organization",
        "status",
        "latency_ms",
        "error_code",
    )
    list_filter = (
        "status",
        "usage_day",
    )
    search_fields = (
        "organization__name",
        "error_code",
    )
    ordering = ("-created_at",)
    list_select_related = ("organization",)
