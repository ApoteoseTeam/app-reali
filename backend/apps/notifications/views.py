from django.db import transaction
from uuid import UUID
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.audit import audit
from apps.api.models import AuditLog
from apps.api.permissions import (
    ROLE_PERMISSIONS,
    internal_operator,
    membership_for,
    require_role,
    schools_for,
)
from apps.cameras.models import Camera
from apps.meals.models import MealService

from .devices import register_device
from .models import Kind, Notification, NotificationPreference, PushDevice
from .serializers import (
    AuditFilters,
    AuditSerializer,
    InboxFilters,
    NotificationSerializer,
    PreferencePatchSerializer,
    PreferenceSerializer,
    PushDeviceSerializer,
    PushRegistrationSerializer,
    ReadAllSerializer,
    ScopeFilters,
    UnreadCountSerializer,
)
from .services import INVITATION_KINDS, POLICIES, kinds_for, preferences


def validated(serializer, data):
    form = serializer(data=data)
    form.is_valid(raise_exception=True)
    return dict(form.validated_data)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, InboxFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER, ScopeFilters]),
)
class InboxViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_value_converter = "uuid"
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        self.member = membership_for(self.request)
        self.filters = validated(
            InboxFilters if self.action == "list" else ScopeFilters,
            self.request.query_params.dict(),
        )
        schools = schools_for(self.member, active_only=True)
        school_id = self.filters.get("school_id")
        if school_id is not None:
            schools = schools.filter(pk=school_id)
            if not schools.exists():
                raise NotFound("Escola não encontrada.")
        qs = Notification.objects.filter(
            Q(school__isnull=True) | Q(school_id__in=schools),
            recipient=self.request.user,
            organization=self.member.organization,
            kind__in=kinds_for(self.member),
        )
        if not self.member.all_schools_access:
            qs = qs.exclude(kind__in=INVITATION_KINDS, school__isnull=True)
        if self.action in {"list", "unread_count", "read_all"}:
            qs = qs.filter(
                in_app=True, archived_at__isnull=not self.filters.get("archived", False)
            )
            if "unread" in self.filters:
                qs = qs.filter(read_at__isnull=self.filters["unread"])
            if "type" in self.filters:
                qs = qs.filter(kind=self.filters["type"])
        return qs.select_related("school").order_by("-created_at", "-pk")

    def action_data(self, row):
        data = row.data if isinstance(row.data, dict) else {}
        resource = data.get("resource")
        role = self.member.role
        if resource == "reports" and role in ROLE_PERMISSIONS["analytics_reports"]:
            return {"resource": resource}
        try:
            resource_id = UUID(str(data.get("resource_id")))
        except ValueError:
            return {}
        if resource == "camera" and role in ROLE_PERMISSIONS["camera_status"]:
            allowed = Camera.objects.filter(
                pk=resource_id, school_id=row.school_id, is_active=True
            ).exists()
        elif resource == "meal" and role in ROLE_PERMISSIONS["meal_history"]:
            allowed = MealService.objects.filter(
                pk=resource_id, school_id=row.school_id
            ).exists()
        else:
            allowed = False
        return (
            {"resource": resource, "resource_id": str(resource_id)} if allowed else {}
        )

    def retrieve(self, request, *args, **kwargs):
        row = self.get_object()
        result = self.get_serializer(row).data
        result["data"] = self.action_data(row)
        return Response(result)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, ScopeFilters], responses=UnreadCountSerializer
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response(
            {"unread_count": self.get_queryset().filter(read_at__isnull=True).count()}
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, ScopeFilters],
        request=None,
        responses=ReadAllSerializer,
    )
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        now = timezone.now()
        count = (
            self.get_queryset()
            .filter(read_at__isnull=True)
            .update(read_at=now, updated_at=now)
        )
        return Response({"updated": count})

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, ScopeFilters],
        request=None,
        responses=NotificationSerializer,
    )
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        return self.set_timestamp(pk, "read_at")

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, ScopeFilters],
        request=None,
        responses=NotificationSerializer,
    )
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        return self.set_timestamp(pk, "archived_at")

    def set_timestamp(self, pk, field):
        qs = self.get_queryset()
        row = get_object_or_404(qs, pk=pk)
        now = timezone.now()
        qs.filter(pk=pk, **{f"{field}__isnull": True}).update(
            **{field: now}, updated_at=now
        )
        row.refresh_from_db(fields=[field])
        return Response(self.get_serializer(row).data)


def preference_row(kind, row):
    policy = POLICIES[kind]
    return dict(
        notification_type=kind,
        label=Kind(kind).label,
        required_in_app=policy.required,
        push_available=policy.push,
        email_available=policy.email,
        **preferences(kind, row),
    )


class PreferenceView(generics.GenericAPIView):
    serializer_class = PreferenceSerializer

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], responses=PreferenceSerializer(many=True)
    )
    def get(self, request):
        member = membership_for(request)
        rows = {
            row.kind: row
            for row in NotificationPreference.objects.filter(
                user=request.user,
                organization=member.organization,
            )
        }
        return Response(
            [preference_row(kind, rows.get(kind)) for kind in kinds_for(member)]
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=PreferencePatchSerializer,
        responses=PreferenceSerializer,
    )
    @transaction.atomic
    def patch(self, request):
        member = membership_for(request)
        values = validated(PreferencePatchSerializer, request.data)
        kind = values.pop("notification_type")
        if kind not in kinds_for(member):
            raise NotFound("Preferência indisponível neste vínculo.")
        row, _ = NotificationPreference.objects.select_for_update().get_or_create(
            user=request.user,
            organization=member.organization,
            kind=kind,
        )
        for field, value in values.items():
            setattr(row, field, value)
        row.save(update_fields=[*values, "updated_at"])
        audit(
            "NOTIFICATION_PREFERENCE_CHANGED",
            row,
            actor=request.user,
            organization=member.organization,
            details={"notification_type": kind},
        )
        return Response(preference_row(kind, row))


class PushDeviceViewSet(viewsets.GenericViewSet):
    queryset = PushDevice.objects.none()
    lookup_value_converter = "uuid"
    serializer_class = PushDeviceSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "push-registration"

    @extend_schema(
        request=PushRegistrationSerializer, responses={201: PushDeviceSerializer}
    )
    def create(self, request):
        values = validated(PushRegistrationSerializer, request.data)
        device = register_device(request.user, request.auth, **values)
        return Response(self.get_serializer(device).data, status=201)

    @extend_schema(responses={204: None})
    @transaction.atomic
    def destroy(self, request, pk=None):
        device = get_object_or_404(
            PushDevice.objects.select_for_update(), pk=pk, user=request.user
        )
        if device.is_active:
            device.is_active = False
            device.save(update_fields=["is_active", "updated_at"])
        return Response(status=204)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, AuditFilters]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class AuditViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    lookup_value_converter = "uuid"
    queryset = AuditLog.objects.none()
    serializer_class = AuditSerializer
    platform = False

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        records = AuditLog.objects.order_by("-created_at", "-pk")
        if self.platform:
            internal_operator(self.request.user, "api.view_auditlog")
        else:
            member = require_role(membership_for(self.request), "audit_logs")
            scope = Q(school_id__in=schools_for(member))
            if member.all_schools_access:
                scope |= Q(school__isnull=True)
            records = records.filter(scope, organization=member.organization)
        if self.action != "list":
            return records
        filters = validated(AuditFilters, self.request.query_params.dict())
        if not self.platform and "organization_id" in filters:
            raise ValidationError(
                {"organization_id": "Use o cabeçalho X-Organization-ID."}
            )
        lookups = {
            "start_date": "created_at__date__gte",
            "end_date": "created_at__date__lte",
            "target_id": "object_id",
        }
        return records.filter(
            **{
                lookups.get(field, field): value
                for field, value in filters.items()
                if field not in {"page", "format"}
            }
        )


@extend_schema_view(
    list=extend_schema(parameters=[AuditFilters]),
    retrieve=extend_schema(),
)
class PlatformAuditViewSet(AuditViewSet):
    platform = True
