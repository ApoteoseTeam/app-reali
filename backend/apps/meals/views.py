from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.permissions import membership_for, require_role, schools_for
from apps.users.models import Membership

from . import serializers as s
from .models import (
    AttendanceSnapshot,
    MealForecast,
    MealForecastPolicy,
    MealSchedule,
    MealService,
)
from .services import (
    cancel_service,
    finish_service,
    generate_service,
    save_policy,
    save_schedule,
    save_service,
    start_preparation,
    start_serving,
)


def meal_scope(request, action):
    return require_role(membership_for(request), action)


def recent_for_cook(queryset, member, field):
    if member.role == Membership.Role.COOK:
        return queryset.filter(**{field: timezone.localdate() - timedelta(days=29)})
    return queryset


def validated(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class ScopedMealViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    lookup_value_converter = "uuid"
    read_permission = "meal_history"
    write_permission = "manage_meals"
    filter_class = s.ScheduleFilters

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            member = membership_for(self.request)
            context["membership"] = member
            context["limited_history"] = member.role == Membership.Role.COOK
        return context

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset.none()
        member = meal_scope(
            self.request,
            self.read_permission
            if self.action in {"list", "retrieve"}
            else self.write_permission,
        )
        queryset = self.queryset.filter(school__in=schools_for(member))
        if self.action == "list":
            queryset = queryset.filter(
                **validated(self.filter_class, self.request.query_params.dict())
            )
        return queryset.order_by("id")

    def perform_create(self, serializer):
        serializer.instance = self.save_record(
            meal_scope(self.request, self.write_permission), serializer.validated_data
        )

    def perform_update(self, serializer):
        serializer.instance = self.save_record(
            meal_scope(self.request, self.write_permission),
            serializer.validated_data,
            serializer.instance.pk,
        )


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.ServiceFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    destroy=extend_schema(exclude=True),
)
class MealServiceViewSet(mixins.DestroyModelMixin, ScopedMealViewSet):
    serializer_class = s.MealServiceSerializer
    filter_class = s.ServiceFilters
    queryset = MealService.objects.all()
    save_record = staticmethod(save_service)

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return queryset
        return recent_for_cook(queryset, membership_for(self.request), "date__gte")

    def perform_destroy(self, instance):
        raise PermissionDenied("Use cancelamento para preservar o histórico.")

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.StartMealSerializer,
        responses=s.StartedMealSerializer,
    )
    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        member = meal_scope(request, "prepare")
        data = validated(s.StartMealSerializer, request.data)
        meal = start_preparation(member, pk, data.get("estimated_plates_per_entry"))
        return Response(
            s.StartedMealSerializer(meal, context=self.get_serializer_context()).data
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=None,
        responses=s.MealServiceSerializer,
    )
    @action(detail=True, methods=["post"], url_path="start-serving")
    def start_serving(self, request, pk=None):
        meal = start_serving(meal_scope(request, "prepare"), pk)
        return Response(self.get_serializer(meal).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=None,
        responses=s.MealServiceSerializer,
    )
    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        meal = finish_service(meal_scope(request, "prepare"), pk)
        return Response(self.get_serializer(meal).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.CancelMealSerializer,
        responses=s.MealServiceSerializer,
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        member = meal_scope(request, "manage_meals")
        meal = cancel_service(
            member, pk, validated(s.CancelMealSerializer, request.data)["reason"]
        )
        return Response(self.get_serializer(meal).data)

    def forecast_meal(self):
        member = meal_scope(self.request, "forecast")
        meals = MealService.objects.filter(
            pk=self.kwargs["pk"], school__in=schools_for(member)
        )
        meal = recent_for_cook(meals, member, "date__gte").first()
        if not meal:
            raise NotFound("Serviço não encontrado no seu escopo.")
        return meal

    @extend_schema(parameters=[ORGANIZATION_HEADER], responses=s.SnapshotSerializer)
    @action(detail=True, methods=["get"], url_path="attendance-snapshot")
    def attendance_snapshot(self, request, pk=None):
        snapshot = AttendanceSnapshot.objects.filter(
            meal_service=self.forecast_meal()
        ).first()
        if not snapshot:
            raise NotFound("Snapshot ainda não criado.")
        return Response(s.SnapshotSerializer(snapshot).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], responses=s.ForecastSerializer)
    @action(detail=True, methods=["get"])
    def forecast(self, request, pk=None):
        forecast = MealForecast.objects.filter(
            meal_service=self.forecast_meal()
        ).first()
        if not forecast:
            raise NotFound("Previsão ainda não criada.")
        return Response(
            s.ForecastSerializer(forecast, context=self.get_serializer_context()).data
        )


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.ScheduleFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class ScheduleViewSet(ScopedMealViewSet):
    serializer_class = s.ScheduleSerializer
    queryset = MealSchedule.objects.all()
    save_record = staticmethod(save_schedule)
    http_method_names = ["get", "post", "patch", "head", "options"]

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.GenerateScheduleSerializer,
        responses={200: s.MealServiceSerializer, 201: s.MealServiceSerializer},
    )
    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        member = meal_scope(request, "manage_meals")
        meal, created = generate_service(
            member, pk, validated(s.GenerateScheduleSerializer, request.data)["date"]
        )
        return Response(
            s.MealServiceSerializer(meal).data, status=201 if created else 200
        )


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.ScheduleFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class ForecastPolicyViewSet(ScopedMealViewSet):
    serializer_class = s.ForecastPolicySerializer
    queryset = MealForecastPolicy.objects.all()
    read_permission = write_permission = "forecast_policy"
    save_record = staticmethod(save_policy)
    http_method_names = ["get", "post", "patch", "head", "options"]


@extend_schema_view(
    get=extend_schema(parameters=[ORGANIZATION_HEADER, s.ServiceFilters])
)
class ForecastListView(generics.ListAPIView):
    serializer_class = s.ForecastSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            context["limited_history"] = (
                membership_for(self.request).role == Membership.Role.COOK
            )
        return context

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return MealForecast.objects.none()
        member = meal_scope(self.request, "forecast")
        queryset = MealForecast.objects.filter(
            meal_service__school__in=schools_for(member)
        )
        queryset = recent_for_cook(queryset, member, "meal_service__date__gte")
        filters = validated(s.ServiceFilters, self.request.query_params.dict())
        return queryset.filter(
            **{f"meal_service__{field}": value for field, value in filters.items()}
        ).order_by("-created_at", "id")
