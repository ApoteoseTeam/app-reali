from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import (
    PolymorphicProxySerializer,
    extend_schema,
    extend_schema_view,
)
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.audit import audit
from apps.api.models import CameraCredential
from apps.api.permissions import (
    internal_operator,
    membership_for,
    organization_id_for,
    require_role,
    schools_for,
)
from apps.api.session_auth import SESSION_CLAIM
from apps.institutions.models import Organization
from apps.counting.serializers import CountActivitySerializer
from apps.users.models import Membership, User

from . import serializers as s
from .authentication import (
    DeviceAuthentication,
    DeviceTrafficThrottle,
    IsDevice,
    LegacyCameraAuthentication,
)
from .models import Camera, CameraConfiguration, EdgeDevice
from .monitoring import device_configuration, legacy_heartbeat, receive_heartbeat
from .observability import log_device_event
from .provisioning import (
    change_credential,
    ensure_same_school,
    save_configuration,
    update_camera,
    update_device,
)


class ScopeViewSet(viewsets.GenericViewSet):
    lookup_value_converter = "uuid"
    support = False
    queryset = Camera.objects.none()

    def scope(self):
        if self.support:
            internal_operator(self.request.user, "cameras.support_camera_devices")
            organization = Organization.objects.filter(
                pk=organization_id_for(self.request), is_active=True
            ).first()
            if not organization:
                raise NotFound("Organização indisponível.")
            return organization, organization.schools.all(), None
        actor = membership_for(self.request)
        action = self.required_action()
        require_role(actor, action)
        return actor.organization, schools_for(actor), actor.role

    def locked_scope(self):
        organization, _, _ = self.scope()
        Organization.objects.select_for_update().get(pk=organization.pk)
        return self.scope()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            context["authorized_schools"] = self.scope()[1]
        return context

    def require_active_school(self, schools, school_id):
        if not schools.filter(pk=school_id, is_active=True).exists():
            raise PermissionDenied("Escola indisponível no seu escopo.")


CAMERA_READS = {"list", "retrieve", "status"}


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.CameraFilterSerializer]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
    destroy=extend_schema(exclude=True),
)
class CameraViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    ScopeViewSet,
):
    serializer_class = s.CameraSerializer

    def required_action(self):
        if self.action in CAMERA_READS:
            return "camera_status"
        if self.action in {"health_history", "count_activity"}:
            return "camera_history"
        return "camera_admin"

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"} and not getattr(
            self, "swagger_fake_view", False
        ):
            if self.scope()[2] == Membership.Role.COOK:
                return s.CameraSummarySerializer
        return super().get_serializer_class()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        _, schools, role = self.scope()
        cameras = Camera.objects.filter(school__in=schools).order_by("id")
        if role == Membership.Role.COOK:
            cameras = cameras.filter(camera_type=Camera.CameraType.CAFETERIA)
        if self.action == "status":
            cameras = cameras.select_related("edge_device__school__organization")
        if self.action == "list":
            filters = s.CameraFilterSerializer(data=self.request.query_params.dict())
            filters.is_valid(raise_exception=True)
            cameras = cameras.filter(**filters.validated_data)
        return cameras

    @transaction.atomic
    def perform_create(self, serializer):
        organization, schools, _ = self.locked_scope()
        school = serializer.validated_data["school"]
        self.require_active_school(schools, school.pk)
        ensure_same_school(school, serializer.validated_data.get("edge_device"))
        camera = serializer.save()
        audit(
            "CAMERA_CREATED",
            camera,
            actor=self.request.user,
            organization=organization,
            details={"school_id": str(school.pk)},
        )

    def locked_camera(self):
        _, schools, _ = self.locked_scope()
        camera = (
            Camera.objects.select_for_update()
            .filter(pk=self.kwargs["pk"], school__in=schools)
            .first()
        )
        if not camera:
            raise NotFound("Câmera não encontrada.")
        return camera, schools

    @transaction.atomic
    def perform_update(self, serializer):
        camera, schools = self.locked_camera()
        self.require_active_school(schools, camera.school_id)
        if "school" in serializer.validated_data:
            self.require_active_school(schools, serializer.validated_data["school"].pk)
        serializer.instance = update_camera(
            camera, serializer.validated_data, self.request.user
        )

    def perform_destroy(self, instance):
        raise PermissionDenied("Desative a câmera para preservar seu histórico.")

    def change_activation(self, active):
        camera, schools = self.locked_camera()
        if active:
            self.require_active_school(schools, camera.school_id)
        return Response(
            self.get_serializer(
                update_camera(camera, {"is_active": active}, self.request.user)
            ).data
        )

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=None)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def activate(self, request, pk=None):
        return self.change_activation(True)

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=None)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def deactivate(self, request, pk=None):
        return self.change_activation(False)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        responses=PolymorphicProxySerializer(
            component_name="CameraStatusResponse",
            serializers=[s.CameraSummarySerializer, s.CameraStatusSerializer],
            resource_type_field_name=None,
        ),
    )
    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        camera = self.get_object()
        serializer = (
            s.CameraSummarySerializer
            if self.scope()[2] == Membership.Role.COOK
            else s.CameraStatusSerializer
        )
        return Response(serializer(camera).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        responses=s.CameraHealthEventSerializer(many=True),
    )
    @action(detail=True, methods=["get"], url_path="health-history")
    def health_history(self, request, pk=None):
        events = self.get_object().health_events.order_by("-occurred_at", "-id")
        if self.scope()[2] == Membership.Role.NUTRITIONIST:
            events = events.filter(occurred_at__gte=timezone.now() - timedelta(days=7))
        page = self.paginate_queryset(events)
        return self.get_paginated_response(
            s.CameraHealthEventSerializer(page, many=True).data
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], responses=s.CameraConfigurationSerializer
    )
    @action(detail=True, methods=["get"])
    def configuration(self, request, pk=None):
        config = CameraConfiguration.objects.filter(camera=self.get_object()).first()
        if not config:
            raise NotFound("A câmera ainda não tem configuração.")
        return Response(s.CameraConfigurationSerializer(config).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], responses=CountActivitySerializer)
    @action(detail=True, methods=["get"], url_path="count-activity")
    def count_activity(self, request, pk=None):
        stats = getattr(self.get_object(), "count_activity", None)
        received = stats.last_received_at if stats else None
        recorded = stats.last_recorded_at if stats else None
        return Response(
            CountActivitySerializer(
                {
                    "processed": stats.processed if stats else 0,
                    "duplicates": stats.duplicates if stats else 0,
                    "rejected": stats.rejected if stats else 0,
                    "last_received_at": received,
                    "last_recorded_at": recorded,
                    "last_attempt_at": stats.updated_at
                    if stats and (stats.duplicates or stats.rejected)
                    else received,
                    "last_delay_seconds": max(0, (received - recorded).total_seconds())
                    if received and recorded
                    else None,
                }
            ).data
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.CameraParametersSerializer,
        responses=s.CameraConfigurationSerializer,
    )
    @configuration.mapping.put
    @transaction.atomic
    def replace_configuration(self, request, pk=None):
        camera, schools = self.locked_camera()
        self.require_active_school(schools, camera.school_id)
        serializer = s.CameraParametersSerializer(
            data=request.data, context={"camera": camera}
        )
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            log_device_event(
                "CAMERA_CONFIGURATION_REJECTED",
                camera=camera,
                reason="invalid_configuration",
            )
            raise
        config = save_configuration(camera, serializer.validated_data, request.user)
        return Response(s.CameraConfigurationSerializer(config).data)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
    create=extend_schema(parameters=[ORGANIZATION_HEADER]),
    partial_update=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class EdgeDeviceViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    ScopeViewSet,
):
    http_method_names = ["get", "post", "patch", "head", "options"]
    throttle_scope = None
    serializer_class = s.EdgeDeviceSerializer
    queryset = EdgeDevice.objects.none()

    def required_action(self):
        return (
            "camera_history" if self.action in {"list", "retrieve"} else "camera_admin"
        )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        _, schools, _ = self.scope()
        return (
            EdgeDevice.objects.filter(school__in=schools)
            .select_related("school__organization")
            .order_by("id")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        organization, schools, _ = self.locked_scope()
        school = serializer.validated_data["school"]
        self.require_active_school(schools, school.pk)
        device = serializer.save()
        audit(
            "EDGE_DEVICE_CREATED",
            device,
            actor=self.request.user,
            organization=organization,
            details={"school_id": str(school.pk)},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        _, schools, _ = self.locked_scope()
        device = (
            EdgeDevice.objects.select_for_update(of=("self",), no_key=True)
            .select_related("school__organization")
            .filter(
                pk=serializer.instance.pk,
                school__in=schools,
            )
            .first()
        )
        if not device:
            raise NotFound("Agente não encontrado.")
        data = dict(serializer.validated_data)
        if data.pop("school", device.school).pk != device.school_id:
            raise ValidationError({"school": "O agente mantém sua escola original."})
        if data.get("is_active") is True:
            self.require_active_school(schools, device.school_id)
        serializer.instance = update_device(device, data, self.request.user)

    @transaction.atomic
    def credential_action(self, request, operation):
        _, schools, _ = self.locked_scope()
        device_id = self.kwargs["pk"]
        if not EdgeDevice.objects.filter(pk=device_id, school__in=schools).exists():
            raise NotFound("Agente não encontrado.")
        serializer_class = (
            s.ReauthenticateSerializer
            if operation == "revoke"
            else s.CredentialInputSerializer
        )
        serializer = serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        actor = (
            User.objects.select_for_update()
            .filter(pk=request.user.pk, is_active=True)
            .first()
        )
        session_version = (
            request.auth.get(SESSION_CLAIM, 0)
            if request.auth is not None
            else request.user.session_version
        )
        if (
            not actor
            or actor.session_version != session_version
            or not actor.check_password(serializer.validated_data["password"])
        ):
            raise PermissionDenied("Confirme a senha administrativa atual.")
        result = change_credential(
            device_id, actor, operation, serializer.validated_data.get("expires_at")
        )
        if result is None:
            return Response(status=204)
        credential, token = result
        response = {**s.DeviceCredentialSerializer(credential).data, "token": token}
        return Response(response, status=201, headers={"Cache-Control": "no-store"})

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.CredentialInputSerializer,
        responses={201: s.IssuedCredentialSerializer},
    )
    @action(
        detail=True,
        methods=["post"],
        throttle_classes=[ScopedRateThrottle],
        throttle_scope="device-credential-management",
    )
    def credentials(self, request, pk=None):
        return self.credential_action(request, "issue")

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.CredentialInputSerializer,
        responses={201: s.IssuedCredentialSerializer},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="rotate-credential",
        throttle_classes=[ScopedRateThrottle],
        throttle_scope="device-credential-management",
    )
    def rotate_credential(self, request, pk=None):
        return self.credential_action(request, "rotate")

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.ReauthenticateSerializer,
        responses={204: None},
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="revoke-credential",
        throttle_classes=[ScopedRateThrottle],
        throttle_scope="device-credential-management",
    )
    def revoke_credential(self, request, pk=None):
        return self.credential_action(request, "revoke")


class SupportCameraViewSet(CameraViewSet):
    support = True


class SupportEdgeDeviceViewSet(EdgeDeviceViewSet):
    support = True


class DeviceHeartbeatView(APIView):
    permission_classes = [IsDevice]
    authentication_classes = [DeviceAuthentication, LegacyCameraAuthentication]
    throttle_classes = [DeviceTrafficThrottle]

    @extend_schema(
        request=s.HeartbeatSerializer,
        responses=PolymorphicProxySerializer(
            component_name="CameraHeartbeatResponse",
            serializers=[
                s.HeartbeatResponseSerializer,
                s.LegacyHeartbeatResponseSerializer,
            ],
            resource_type_field_name=None,
        ),
    )
    def post(self, request):
        if isinstance(request.auth, CameraCredential):
            return Response(legacy_heartbeat(request.auth))
        serializer = s.HeartbeatSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            return Response(receive_heartbeat(request.auth, serializer.validated_data))
        except ValidationError:
            log_device_event(
                "DEVICE_HEARTBEAT_REJECTED",
                device=request.auth.edge_device,
                reason="invalid_payload",
            )
            raise


class DeviceConfigurationView(APIView):
    permission_classes = [IsDevice]
    authentication_classes = [DeviceAuthentication]
    throttle_classes = [DeviceTrafficThrottle]

    @extend_schema(responses=s.DeviceConfigurationSerializer)
    def get(self, request):
        configuration = device_configuration(request.auth)
        return Response(
            s.DeviceConfigurationSerializer(configuration).data,
            headers={"Cache-Control": "no-store"},
        )
