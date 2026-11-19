from datetime import date, timedelta

from django.db import DatabaseError
from django.db.models import Count
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, mixins, viewsets
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.audit import audit
from apps.api.permissions import membership_for, require_role, schools_for
from apps.meals.models import MealService
from apps.users.models import Membership

from . import serializers as s
from .exports import report_file
from .models import DailyMetrics
from .reporting import day_scope, filtered_meals, report_rollups
from .selectors import meal_metrics, meal_rows
from .services import logger, rebuild_daily_metrics


class ScopeMixin:
    permission = "indicators"
    filter_class = s.PeriodSerializer

    def scope(self):
        member = require_role(membership_for(self.request), self.permission)
        return member, schools_for(member)

    def report_scope(self, *, single_day=False, max_days=366):
        member, schools = self.scope()
        query = self.request.query_params.dict()
        if self.filter_class is s.ExportFilters and "format" in query:
            query.setdefault("file_format", query["format"])
        serializer = self.filter_class(data=query)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data
        today = timezone.localdate()
        if "date" in filters and ("start_date" in filters or "end_date" in filters):
            raise ValidationError("Use data única ou intervalo.")
        end = filters.get("date", filters.get("end_date", today))
        if end.year < 1900 or end > today:
            raise ValidationError("Período inválido para esta consulta.")
        start = filters.get(
            "date",
            filters.get("start_date", end if single_day else end - timedelta(days=29)),
        )
        if (
            (single_day and start != end)
            or start > end
            or start.year < 1900
            or (end - start).days >= max_days
        ):
            raise ValidationError("Período inválido para esta consulta.")
        if member.role in {
            Membership.Role.COOK,
            Membership.Role.TEACHER,
        } and start < today - timedelta(days=29):
            raise ValidationError("O papel permite consultar os últimos 30 dias.")
        if "school" in filters:
            schools = schools.filter(pk=filters["school"])
            if not schools.exists():
                raise NotFound("Escola não encontrada no seu escopo.")
        if (
            member.role == Membership.Role.TEACHER
            and {"meal_type", "status"} & filters.keys()
        ):
            raise ValidationError(
                "Filtros de refeição exigem acesso aos indicadores de serviço."
            )
        return member, schools, {**filters, "start_date": start, "end_date": end}


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.DateFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class DailyMetricsView(ScopeMixin, viewsets.ReadOnlyModelViewSet):
    filter_class = s.DateFilters
    lookup_value_converter = "uuid"
    serializer_class = s.DailyMetricsSerializer
    queryset = DailyMetrics.objects.none()

    def get_serializer_context(self):
        result = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            result["entry_only"] = self.scope()[0].role == Membership.Role.TEACHER
        return result

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        if self.action == "retrieve":
            member, schools = self.scope()
            today = timezone.localdate()
            start = (
                today - timedelta(days=29)
                if member.role in {Membership.Role.COOK, Membership.Role.TEACHER}
                else date(1900, 1, 1)
            )
            end = today
        else:
            member, schools, filters = self.report_scope()
            start, end = filters["start_date"], filters["end_date"]
            if member.role not in {
                Membership.Role.COOK,
                Membership.Role.TEACHER,
            } and not (
                {"date", "start_date", "end_date"} & self.request.query_params.keys()
            ):
                start = date(1900, 1, 1)
        return day_scope(
            schools, start, end, entry_only=member.role == Membership.Role.TEACHER
        ).order_by("-reference_date", "id")


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.PeriodSerializer]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class MealMetricsView(
    ScopeMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission = "meal_history"
    lookup_value_converter = "uuid"
    serializer_class = s.MealMetricsSerializer
    queryset = meal_rows([])

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        if self.action == "retrieve":
            member, schools = self.scope()
            rows = meal_rows(schools)
            if member.role == Membership.Role.COOK:
                rows = rows.filter(date__gte=timezone.localdate() - timedelta(days=29))
        else:
            _, schools, filters = self.report_scope()
            rows = filtered_meals(schools, filters)
        return rows.order_by("-date", "id")

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(
            self.get_serializer([meal_metrics(row) for row in page], many=True).data
        )

    def retrieve(self, request, *args, **kwargs):
        return Response(self.get_serializer(meal_metrics(self.get_object())).data)


class RebuildMetricsView(ScopeMixin, APIView):
    permission = "rebuild_metrics"
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-rebuild"

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.RebuildMetricsSerializer,
        responses=s.DailyMetricsSerializer,
    )
    def post(self, request):
        member, schools = self.scope()
        serializer = s.RebuildMetricsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        school = schools.filter(
            pk=serializer.validated_data["school"], is_active=True
        ).first()
        if not school:
            raise NotFound("Escola não encontrada no seu escopo.")
        day = serializer.validated_data["date"]
        if day > timezone.localdate():
            raise ValidationError({"date": "A data deve ser hoje ou anterior."})
        try:
            row = rebuild_daily_metrics(school, day, actor=member.user)
        except DatabaseError as exc:
            logger.exception("Falha na consolidação escola=%s data=%s", school.pk, day)
            error = APIException("Falha temporária na consolidação.")
            error.status_code = 503
            raise error from exc
        return Response(s.DailyMetricsSerializer(row).data)


class DashboardView(ScopeMixin, APIView):
    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.PeriodSerializer],
        responses=s.DashboardSerializer,
    )
    def get(self, request):
        member, schools, filters = self.report_scope(single_day=True)
        entry_only = member.role == Membership.Role.TEACHER
        summary = report_rollups(schools, filters, entry_only=entry_only)[0]
        meals = (
            []
            if entry_only
            else list(
                filtered_meals(schools, filters).order_by("scheduled_time", "id")[:51]
            )
        )
        return Response(
            s.DashboardSerializer(
                {
                    **summary,
                    "school_id": filters.get("school"),
                    "reference_date": filters["start_date"],
                    "meal_services": [meal_metrics(meal) for meal in meals[:50]],
                    "meal_services_truncated": len(meals) > 50,
                }
            ).data
        )


class HistoryView(ScopeMixin, generics.GenericAPIView):
    filter_class = s.HistoryFilters
    serializer_class = s.MetricValues
    group = None

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.HistoryFilters],
        responses=s.MetricValues(many=True),
    )
    def get(self, request):
        member, schools, filters = self.report_scope()
        group = self.group or filters.get("group", "daily")
        rows = report_rollups(
            schools,
            filters,
            group=group,
            entry_only=member.role == Membership.Role.TEACHER,
        )
        return self.get_paginated_response(
            self.get_serializer(self.paginate_queryset(rows), many=True).data
        )


class OrganizationSummaryView(ScopeMixin, APIView):
    permission = "analytics_reports"

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.PeriodSerializer],
        responses=s.PeriodSummarySerializer,
    )
    def get(self, request):
        member, schools, filters = self.report_scope()
        span = filters["end_date"] - filters["start_date"] + timedelta(days=1)
        previous_filters = {
            **filters,
            "start_date": filters["start_date"] - span,
            "end_date": filters["start_date"] - timedelta(days=1),
        }
        current = report_rollups(schools, filters)[0]
        previous = report_rollups(schools, previous_filters)[0]
        comparison = {}
        for name in (
            "total_student_entries",
            "total_forecast_plates",
            "total_served_plates",
        ):
            comparison[name] = (
                current[name] - previous[name]
                if current[name] is not None and previous[name] is not None
                else None
            )
        meals = MealService.objects.filter(
            school__in=schools,
            date__range=(filters["start_date"], filters["end_date"]),
        ).exclude(status=MealService.Status.CANCELLED)
        for name in ("meal_type", "status"):
            if name in filters:
                meals = meals.filter(**{name: filters[name]})
        counts = meals.values("meal_type").annotate(total=Count("pk")).order_by()
        return Response(
            s.PeriodSummarySerializer(
                {
                    "organization_id": member.organization_id,
                    "summary": current,
                    "previous": previous,
                    "period": filters,
                    "previous_period": previous_filters,
                    "comparison": comparison,
                    "service_count_by_type": {
                        item["meal_type"]: item["total"] for item in counts
                    },
                }
            ).data
        )


class SchoolComparisonView(ScopeMixin, generics.GenericAPIView):
    permission = "analytics_reports"
    serializer_class = s.MetricValues

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.PeriodSerializer],
        responses=s.MetricValues(many=True),
    )
    def get(self, request):
        _, schools, filters = self.report_scope()
        page = self.paginate_queryset(schools)
        scoped_page = schools.filter(pk__in=[school.pk for school in page])
        rows = report_rollups(scoped_page, filters, by_school=True)
        return self.get_paginated_response(self.get_serializer(rows, many=True).data)


class FileNegotiation(DefaultContentNegotiation):
    def select_renderer(self, request, renderers, format_suffix=None):
        return renderers[0], renderers[0].media_type


class ExportView(ScopeMixin, APIView):
    permission = "analytics_reports"
    filter_class = s.ExportFilters
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "analytics-export"
    content_negotiation_class = FileNegotiation

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.ExportFilters],
        responses={
            (200, "text/csv"): OpenApiTypes.BINARY,
            (200, "application/pdf"): OpenApiTypes.BINARY,
        },
    )
    def get(self, request):
        member, schools, filters = self.report_scope(max_days=90)
        start, end = filters["start_date"], filters["end_date"]
        file_format = filters.get("file_format", "csv")
        rows = report_rollups(schools, filters, group=filters.get("group", "daily"))
        label = schools.first().name if "school" in filters else "Escolas autorizadas"
        response = report_file(
            rows,
            file_format,
            member.organization.name,
            label,
            start,
            end,
            timezone.localtime(),
        )
        audit(
            "ANALYTICS_REPORT_EXPORTED",
            member.organization,
            actor=member.user,
            organization=member.organization,
            details={
                "start": start.isoformat(),
                "end": end.isoformat(),
                "format": file_format,
                "school_id": str(filters["school"]) if "school" in filters else None,
            },
        )
        return response
