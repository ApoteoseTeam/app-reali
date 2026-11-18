import hashlib
import hmac
from datetime import timedelta
from urllib.parse import urlencode, urlsplit
from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import generics, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.fields import UUIDField
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.users.models import User, Membership
from apps.institutions.models import Organization, School
from apps.cameras.models import Camera
from apps.counting.models import StudentCount, PlateCount
from apps.meals.models import MealService, MealForecast
from apps.analytics.models import DailyMetrics
from .models import UserInvitation, CameraCredential
from .permissions import membership_for, require_management, require_admin
from . import serializers as s
from .services import (
    start_meal,
    advance_meal,
    rebuild_daily_metrics,
    record_device_event,
)

ORGANIZATION_HEADER = OpenApiParameter(
    "X-Organization-ID", type=OpenApiTypes.UUID, location="header", required=True
)
DEVICE_HEADERS = [
    OpenApiParameter(
        "X-Camera-ID", type=OpenApiTypes.UUID, location="header", required=True
    ),
    OpenApiParameter("X-Camera-Key", type=str, location="header", required=True),
]
MESSAGE_RESPONSE = inline_serializer(
    "MessageResponse", fields={"message": serializers.CharField()}
)


class LoginView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RequestInstitutionView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = s.InstitutionRequestSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "institution-request"


class MeView(APIView):
    @extend_schema(
        responses=inline_serializer(
            "MeResponse",
            fields={
                "user": s.UserSerializer(),
                "memberships": s.MembershipSerializer(many=True),
            },
        )
    )
    def get(self, request):
        memberships = Membership.objects.filter(
            user=request.user, is_active=True, organization__is_active=True
        )
        return Response(
            {
                "user": s.UserSerializer(request.user).data,
                "memberships": s.MembershipSerializer(memberships, many=True).data,
            }
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
        return School.objects.filter(organization=m.organization).order_by("id")

    def perform_create(self, serializer):
        m = require_admin(self.request)
        serializer.save(organization=m.organization)

    def perform_update(self, serializer):
        require_admin(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied(
            "Desativação deve ser feita por atualização administrativa."
        )


class CameraViewSet(TenantViewSet):
    serializer_class = s.CameraSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        return Camera.objects.filter(school__organization=m.organization).order_by("id")

    def perform_create(self, serializer):
        m = require_admin(self.request)
        school = serializer.validated_data["school"]
        if school.organization_id != m.organization_id:
            raise PermissionDenied("Escola de outra organização.")
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        require_admin(self.request)
        camera = Camera.objects.select_for_update().get(pk=serializer.instance.pk)
        serializer.instance = camera
        identity_changed = (
            serializer.validated_data.get("school", camera.school) != camera.school
            or serializer.validated_data.get("camera_type", camera.camera_type)
            != camera.camera_type
        )
        if identity_changed and (
            camera.student_counts.exists() or camera.plate_counts.exists()
        ):
            raise ValidationError(
                "Câmeras com histórico mantêm a escola e o tipo originais."
            )
        school = serializer.validated_data.get("school", serializer.instance.school)
        if school.organization_id != membership_for(self.request).organization_id:
            raise PermissionDenied("Escola de outra organização.")
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("Desative a câmera, não exclua seu histórico.")


class MealServiceViewSet(TenantViewSet):
    serializer_class = s.MealServiceSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        return (
            MealService.objects.filter(school__organization=m.organization)
            .select_related("school")
            .order_by("id")
        )

    def perform_create(self, serializer):
        m = require_management(self.request)
        school = serializer.validated_data["school"]
        if school.organization_id != m.organization_id:
            raise PermissionDenied("Escola de outra organização.")
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        require_management(self.request)
        serializer.instance = MealService.objects.select_for_update().get(
            pk=serializer.instance.pk
        )
        if serializer.instance.status != MealService.Status.PLANNED:
            raise ValidationError("Não edite um serviço em andamento.")
        school = serializer.validated_data.get("school", serializer.instance.school)
        if school.organization_id != membership_for(self.request).organization_id:
            raise PermissionDenied("Escola de outra organização.")
        serializer.save()

    def perform_destroy(self, instance):
        raise PermissionDenied("Use cancelamento, preserve o histórico.")

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=s.StartMealSerializer)
    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        m = membership_for(request)
        if m.role not in {
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
            Membership.Role.COOK,
        }:
            raise PermissionDenied("Sem permissão para iniciar preparo.")
        meal = self.get_object()
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
    def start_serving(self, request, pk=None):
        m = membership_for(request)
        if m.role not in {
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
            Membership.Role.COOK,
        }:
            raise PermissionDenied("Sem permissão para iniciar distribuição.")
        meal = self.get_object()
        meal = advance_meal(
            meal.id,
            MealService.Status.PREPARING,
            MealService.Status.SERVING,
            "serving_started_at",
        )
        return Response(s.MealServiceSerializer(meal).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], request=None)
    @action(detail=True, methods=["post"], url_path="finish")
    def finish(self, request, pk=None):
        m = membership_for(request)
        if m.role not in {
            Membership.Role.ADMIN,
            Membership.Role.MANAGER,
            Membership.Role.COOK,
        }:
            raise PermissionDenied("Sem permissão para finalizar merenda.")
        meal = self.get_object()
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
class StudentCountView(generics.ListAPIView):
    serializer_class = s.StudentCountSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        qs = StudentCount.objects.filter(camera__school__organization=m.organization)
        school = self.request.query_params.get("school")
        if school is not None:
            qs = qs.filter(camera__school_id=s.validate_uuid("school", school))
        return qs.order_by("-recorded_at", "id")


@extend_schema_view(
    get=extend_schema(
        parameters=[
            ORGANIZATION_HEADER,
            OpenApiParameter("meal_service", type=OpenApiTypes.UUID),
        ]
    )
)
class PlateCountView(generics.ListAPIView):
    serializer_class = s.PlateCountSerializer

    def get_queryset(self):
        m = membership_for(self.request)
        qs = PlateCount.objects.filter(
            camera__school__organization=m.organization,
            meal_service__school__organization=m.organization,
        )
        meal = self.request.query_params.get("meal_service")
        if meal is not None:
            qs = qs.filter(meal_service_id=s.validate_uuid("meal_service", meal))
        return qs.order_by("-recorded_at", "id")


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

    def get_queryset(self):
        m = membership_for(self.request)
        qs = DailyMetrics.objects.filter(school__organization=m.organization)
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
        m = require_management(request)
        serializer = s.RebuildMetricsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        day = serializer.validated_data["date"]
        school = School.objects.filter(
            id=serializer.validated_data["school"], organization=m.organization
        ).first()
        if not school:
            raise NotFound("Escola não encontrada.")
        result = rebuild_daily_metrics(school, day)
        return Response(s.DailyMetricsSerializer(result).data)


@extend_schema_view(get=extend_schema(parameters=[ORGANIZATION_HEADER]))
class MembershipsView(generics.ListAPIView):
    serializer_class = s.MembershipSerializer

    def get_queryset(self):
        m = require_management(self.request)
        return (
            Membership.objects.filter(organization=m.organization)
            .select_related("user")
            .order_by("id")
        )


class InvitationsView(APIView):
    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        responses=inline_serializer(
            "InvitationListItem",
            many=True,
            fields={
                "id": serializers.UUIDField(),
                "email": serializers.EmailField(),
                "role": serializers.CharField(),
                "status": serializers.CharField(),
                "expires_at": serializers.DateTimeField(),
            },
        ),
    )
    def get(self, request):
        m = require_admin(request)
        qs = UserInvitation.objects.filter(organization=m.organization).order_by(
            "-created_at"
        )[:100]
        return Response(
            [
                {
                    "id": str(i.id),
                    "email": i.email,
                    "role": i.role,
                    "status": (
                        "EXPIRED" if not i.valid and i.status == "PENDING" else i.status
                    ),
                    "expires_at": i.expires_at,
                }
                for i in qs
            ]
        )

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.InviteSerializer,
        responses={
            201: inline_serializer(
                "InvitationCreated",
                fields={
                    "id": serializers.UUIDField(),
                    "email": serializers.EmailField(),
                    "status": serializers.CharField(),
                },
            )
        },
    )
    def post(self, request):
        m = require_admin(request)
        serializer = s.InviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        if Membership.objects.filter(
            organization=m.organization, user__email__iexact=email, is_active=True
        ).exists():
            raise ValidationError({"email": "Usuário já pertence a esta organização."})
        activation_base = settings.REALI_ACTIVATION_URL
        parsed = urlsplit(activation_base)
        if (
            not parsed.hostname
            or parsed.fragment
            or parsed.scheme not in ({"http", "https"} if settings.DEBUG else {"https"})
        ):
            raise ValidationError("O endereço de ativação precisa ser configurado.")
        raw, hash_value = UserInvitation.generate_token()
        invite = UserInvitation.objects.create(
            organization=m.organization,
            email=email,
            role=serializer.validated_data["role"],
            token_hash=hash_value,
            expires_at=timezone.now() + timedelta(hours=48),
            invited_by=request.user,
        )
        separator = "&" if parsed.query else "?"
        url = f"{activation_base}{separator}{urlencode({'token': raw})}"
        try:
            send_mail(
                "Convite para o Reali",
                f"Você foi convidado para {m.organization.name}. Ative sua conta: {url} (válido por 48 horas).",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception:
            invite.delete()
            raise ValidationError(
                "Falha no envio do e-mail. Nenhum convite foi criado."
            )
        return Response(
            {"id": str(invite.id), "email": email, "status": "PENDING"}, status=201
        )


class AcceptInvitationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation-activation"

    @extend_schema(request=s.InvitationAcceptSerializer, responses=MESSAGE_RESPONSE)
    def post(self, request):
        serializer = s.InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        digest = hashlib.sha256(data["token"].encode()).hexdigest()
        with transaction.atomic():
            invite = (
                UserInvitation.objects.select_for_update()
                .filter(token_hash=digest)
                .first()
            )
            if not invite or not invite.valid or not invite.organization.is_active:
                raise ValidationError(
                    {"token": "Convite inválido, expirado ou utilizado."}
                )
            user = User.objects.filter(email__iexact=invite.email).first()
            if user:
                # Convite para usuário já existente: senha deve ser mantida e nova associação tratada em fluxo de aceite autenticado.
                raise ValidationError(
                    {
                        "email": "Conta existente: solicite ao administrador um convite para vínculo de conta existente."
                    }
                )
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        email=invite.email,
                        full_name=data["full_name"],
                        password=data["password"],
                        is_active=True,
                    )
            except IntegrityError:
                if not User.objects.filter(email__iexact=invite.email).exists():
                    raise
                raise ValidationError({"email": "Já existe uma conta com este e-mail."})
            Membership.objects.create(
                user=user,
                organization=invite.organization,
                role=invite.role,
                is_active=True,
            )
            invite.status = UserInvitation.Status.ACCEPTED
            invite.accepted_at = timezone.now()
            invite.save(update_fields=["status", "accepted_at", "updated_at"])
        return Response({"message": "Conta ativada. Faça login."}, status=200)


class DeviceBaseView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def authenticate_camera(self, request):
        camera_id = request.headers.get("X-Camera-ID")
        raw = request.headers.get("X-Camera-Key", "")
        if not camera_id or not raw:
            raise PermissionDenied("Credenciais da câmera obrigatórias.")
        try:
            camera_id = UUIDField().run_validation(camera_id)
        except ValidationError as exc:
            raise PermissionDenied("Credenciais de dispositivo inválidas.") from exc
        cred = (
            CameraCredential.objects.select_related("camera__school__organization")
            .filter(
                camera_id=camera_id,
                revoked_at__isnull=True,
                camera__is_active=True,
                camera__school__is_active=True,
                camera__school__organization__is_active=True,
            )
            .first()
        )
        if not cred or not hmac.compare_digest(
            cred.secret_hash, hashlib.sha256(raw.encode()).hexdigest()
        ):
            raise PermissionDenied("Credenciais de dispositivo inválidas.")
        return cred.camera


class CameraHeartbeatView(DeviceBaseView):
    @extend_schema(
        parameters=DEVICE_HEADERS,
        request=None,
        responses=inline_serializer(
            "HeartbeatResponse",
            fields={
                "status": serializers.CharField(),
                "camera_id": serializers.UUIDField(),
            },
        ),
    )
    def post(self, request):
        camera = self.authenticate_camera(request)
        camera.last_seen_at = timezone.now()
        camera.save(update_fields=["last_seen_at", "updated_at"])
        return Response({"status": "ok", "camera_id": str(camera.id)})


class DeviceCountsView(DeviceBaseView):
    event_response = inline_serializer(
        "DeviceEventResponse",
        fields={
            "id": serializers.UUIDField(),
            "created": serializers.BooleanField(),
        },
    )

    @extend_schema(
        parameters=DEVICE_HEADERS,
        request=s.DeviceEventSerializer,
        responses={200: event_response, 201: event_response},
    )
    def post(self, request):
        camera = self.authenticate_camera(request)
        serializer = s.DeviceEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        event, created = record_device_event(camera, data)
        return Response(
            {"id": str(event.id), "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
