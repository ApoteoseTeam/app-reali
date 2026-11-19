from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
)
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.models import Membership
from apps.institutions.models import Organization
from apps.meals.models import MealService, MealForecast
from apps.analytics.models import DailyMetrics
from .access_views import ORGANIZATION_HEADER
from .permissions import (
    check_school,
    membership_for,
    require_management,
    require_admin,
    require_role,
    schools_for,
)
from . import serializers as s
from .services import (
    start_meal,
    advance_meal,
    rebuild_daily_metrics,
)


class OrganizationsView(generics.ListAPIView):
    serializer_class = s.OrganizationSerializer

    def get_queryset(self):
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
            is_active=True,
        ).order_by("id")


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    destroy=extend_schema(exclude=True),
)
class TenantViewSet(viewsets.ModelViewSet):
    lookup_value_converter = "uuid"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method in {"POST", "PUT", "PATCH"} and not getattr(
            self, "swagger_fake_view", False
        ):
            context["membership"] = membership_for(self.request)
        return context


class SchoolViewSet(TenantViewSet):
    serializer_class = s.SchoolSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        return schools_for(m)

    @transaction.atomic
    def perform_create(self, serializer):
        m = self.locked_configuration_actor()
        if not m.all_schools_access:
            raise PermissionDenied("Criar uma escola exige acesso institucional.")
        serializer.context["membership"] = m
        serializer.validate_code(serializer.validated_data["code"])
        serializer.save(organization=m.organization)

    @transaction.atomic
    def perform_update(self, serializer):
        m = self.locked_configuration_actor()
        serializer.instance.refresh_from_db()
        check_school(m, serializer.instance)
        serializer.context["membership"] = m
        if "code" in serializer.validated_data:
            serializer.validate_code(serializer.validated_data["code"])
        serializer.save()

    def locked_configuration_actor(self):
        m = require_admin(self.request)
        Organization.objects.select_for_update().get(pk=m.organization_id)
        return require_admin(self.request)

    def perform_destroy(self, instance):
        raise PermissionDenied(
            "Desativação deve ser feita por atualização administrativa."
        )


class MealServiceViewSet(TenantViewSet):
    serializer_class = s.MealServiceSerializer

    def get_queryset(self):
        member = membership_for(self.request)
        if self.action in {"list", "retrieve"}:
            require_role(member, "meal_history")
        qs = (
            MealService.objects.filter(school__in=schools_for(member))
            .select_related("school")
            .order_by("id")
        )
        if member.role == Membership.Role.COOK:
            qs = qs.filter(date__gte=timezone.localdate() - timedelta(days=29))
        if self.action in {"start", "start_serving", "finish"}:
            qs = qs.select_for_update(of=("self",))
        return qs

    def perform_create(self, serializer):
        m = require_management(self.request)
        school = serializer.validated_data["school"]
        check_school(m, school, active_only=True)
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        member = require_management(self.request)
        serializer.instance = MealService.objects.select_for_update().get(
            pk=serializer.instance.pk
        )
        if serializer.instance.status != MealService.Status.PLANNED:
            raise ValidationError("Não edite um serviço em andamento.")
        school = serializer.validated_data.get("school", serializer.instance.school)
        check_school(member, serializer.instance.school, active_only=True)
        check_school(member, school, active_only=True)
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("Use cancelamento, preserve o histórico.")

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=s.StartMealSerializer)
    @action(detail=True, methods=["post"], url_path="start")
    @transaction.atomic
    def start(self, request, pk=None):
        member = require_role(membership_for(request), "prepare")
        meal = self.get_object()
        check_school(member, meal.school, active_only=True)
        serializer = s.StartMealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meal = start_meal(
            meal.id,
            request.user,
            serializer.validated_data["estimated_plates_per_entry"],
        )
        return Response(s.MealServiceSerializer(meal).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=None)
    @action(detail=True, methods=["post"], url_path="start-serving")
    @transaction.atomic
    def start_serving(self, request, pk=None):
        member = require_role(membership_for(request), "prepare")
        meal = self.get_object()
        check_school(member, meal.school, active_only=True)
        meal = advance_meal(
            meal.id,
            MealService.Status.PREPARING,
            MealService.Status.SERVING,
            "serving_started_at",
        )
        return Response(s.MealServiceSerializer(meal).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=None)
    @action(detail=True, methods=["post"], url_path="finish")
    @transaction.atomic
    def finish(self, request, pk=None):
        member = require_role(membership_for(request), "prepare")
        meal = self.get_object()
        check_school(member, meal.school, active_only=True)
        meal = advance_meal(
            meal.id,
            MealService.Status.SERVING,
            MealService.Status.FINISHED,
            "finished_at",
        )
        return Response(s.MealServiceSerializer(meal).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], responses=s.ForecastSerializer)
    @action(detail=True, methods=["get"], url_path="forecast")
    def forecast(self, request, pk=None):
        require_role(membership_for(request), "forecast")
        meal = self.get_object()
        forecast = MealForecast.objects.filter(meal_service=meal).first()
        if not forecast:
            raise NotFound("Previsão ainda não criada.")
        return Response(s.ForecastSerializer(forecast).data)


@extend_schema_view(
    get=extend_schema(
        parameters=[
            ORGANIZATION_HEADER,
            OpenApiParameter("school", type=OpenApiTypes.UUID),
        ]
    )
)
class DailyMetricsView(generics.ListAPIView):
    serializer_class = s.DailyMetricsSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            context["entry_only"] = (
                membership_for(self.request).role == Membership.Role.TEACHER
            )
        return context

    def get_queryset(self):
        m = require_role(membership_for(self.request), "indicators")
        qs = DailyMetrics.objects.filter(school__in=schools_for(m))
        if m.role in {Membership.Role.COOK, Membership.Role.TEACHER}:
            qs = qs.filter(
                reference_date__gte=timezone.localdate() - timedelta(days=29)
            )
        school = self.request.query_params.get("school")
        if school is not None:
            qs = qs.filter(school_id=s.validate_uuid("school", school))
        return qs.order_by("-reference_date", "id")


class RebuildMetricsView(APIView):
    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.RebuildMetricsSerializer,
        responses=s.DailyMetricsSerializer,
    )
    def post(self, request):
        m = require_role(membership_for(request), "rebuild_metrics")
        serializer = s.RebuildMetricsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        day = serializer.validated_data["date"]
        school = (
            schools_for(m, active_only=True)
            .filter(pk=serializer.validated_data["school"])
            .first()
        )
        if not school:
            raise NotFound("Escola não encontrada.")
        result = rebuild_daily_metrics(school, day)
        return Response(s.DailyMetricsSerializer(result).data)
