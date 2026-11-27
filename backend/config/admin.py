from datetime import timedelta

from django.contrib import admin
from django.contrib.admin.apps import AdminConfig
from django.urls import reverse
from django.utils import timezone


class RealiAdminConfig(AdminConfig):
    default_site = "config.admin.RealiAdminSite"

    def ready(self):
        super().ready()
        from apps.core.session_admin import register_session_admin

        register_session_admin(admin.site)


class RealiAdminSite(admin.AdminSite):
    site_header = "Equipe Reali"
    site_title = "Administração Reali"
    index_title = "Painel de operações"
    index_template = "admin/reali_index.html"
    site_url = None

    section_names = {
        "institutions": "Rede escolar",
        "users": "Contas e acessos",
        "api": "Atendimento e auditoria",
        "cameras": "Câmeras e agentes",
        "counting": "Contagens",
        "meals": "Alimentação escolar",
        "analytics": "Indicadores",
        "notifications": "Alertas e notificações",
        "ai": "RealInova",
        "token_blacklist": "Sessões",
        "auth": "Permissões internas",
    }

    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label)
        for app in app_list:
            app["name"] = self.section_names.get(app["app_label"], app["name"])
            for model in app["models"]:
                model_admin = self.get_model_admin(model["model"])
                model["name"] = getattr(model_admin, "reali_label", model["name"])
            app["models"].sort(key=lambda model: model["name"])
        return sorted(app_list, key=lambda app: app["name"])

    def index(self, request, extra_context=None):
        from apps.api.models import InstitutionRequest, UserInvitation
        from apps.institutions.models import Organization
        from apps.meals.models import MealService
        from apps.notifications.models import AlertIncident, NotificationDelivery

        now = timezone.now()
        summaries = (
            ("Instituições ativas", Organization.objects.filter(is_active=True)),
            (
                "Solicitações pendentes",
                InstitutionRequest.objects.filter(
                    status=InstitutionRequest.Status.PENDING
                ),
            ),
            (
                "Convites vigentes",
                UserInvitation.objects.filter(
                    status=UserInvitation.Status.PENDING, expires_at__gt=now
                ),
            ),
            (
                "Serviços de merenda de hoje",
                MealService.objects.filter(date=timezone.localdate(now)),
            ),
            (
                "Incidentes em aberto",
                AlertIncident.objects.filter(opened_at__isnull=False),
            ),
            (
                "Falhas de entrega nas últimas 24 h",
                NotificationDelivery.objects.filter(
                    status__in=(
                        NotificationDelivery.Status.FAILED,
                        NotificationDelivery.Status.REJECTED,
                    ),
                    updated_at__gte=now - timedelta(hours=24),
                ),
            ),
        )
        cards = []
        for title, queryset in summaries:
            if self.get_model_admin(queryset.model).has_view_permission(request):
                opts = queryset.model._meta
                cards.append(
                    {
                        "title": title,
                        "value": queryset.count(),
                        "url": reverse(
                            f"{self.name}:{opts.app_label}_{opts.model_name}_changelist"
                        ),
                    }
                )
        return super().index(
            request, {**(extra_context or {}), "operations_cards": cards}
        )
