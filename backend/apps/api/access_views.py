from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import generics, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from . import access_serializers as s
from .account_service import (
    administer_account,
    change_password,
    confirm_password_reset,
    request_password_reset,
)
from .institution_service import (
    create_institution_request,
    direct_provision,
    recover_director_invitation,
    review_institution,
)
from .invitation_service import (
    accept_invitation,
    invite_employee,
    invitation_schools,
    manageable_invitations,
    update_invitation,
    valid_invitation,
)
from .membership_service import (
    canonical_role,
    manageable_memberships,
    update_membership,
)
from .models import InstitutionRequest
from .permissions import (
    DIRECTORS,
    internal_operator,
    membership_for,
    require_role,
    schools_for,
)
from .serializers import (
    InstitutionRequestSerializer,
    MembershipSerializer,
    SchoolSerializer,
    UserSerializer,
)
from .session_auth import LoginSerializer, LogoutSerializer, RefreshSerializer

ORGANIZATION_HEADER = OpenApiParameter(
    "X-Organization-ID", type=OpenApiTypes.UUID, location="header", required=True
)
REVIEW_PERMISSION = "api.review_institutions"
ACCOUNT_PERMISSION = "api.manage_account_sessions"


def validated(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def staff_context(request):
    return require_role(membership_for(request), "staff")


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(responses=s.SessionSerializer)
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshView(TokenRefreshView):
    serializer_class = RefreshSerializer


class LogoutView(TokenBlacklistView):
    serializer_class = LogoutSerializer


class MeView(APIView):
    @extend_schema(responses=s.MeSerializer)
    def get(self, request):
        memberships = request.user.memberships.filter(
            is_active=True, organization__is_active=True
        ).order_by("id")
        return Response(
            {
                "user": UserSerializer(request.user).data,
                "memberships": MembershipSerializer(memberships, many=True).data,
            }
        )


class MySchoolsView(generics.ListAPIView):
    serializer_class = SchoolSerializer

    @extend_schema(parameters=[ORGANIZATION_HEADER])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return schools_for(membership_for(self.request), active_only=True)


class PublicThrottledView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]


class ChangePasswordView(APIView):
    @extend_schema(request=s.ChangePasswordSerializer, responses={204: None})
    def post(self, request):
        data = validated(s.ChangePasswordSerializer, request.data)
        change_password(request.user.pk, data["current_password"], data["password"])
        return Response(status=204)


class PasswordResetRequestView(PublicThrottledView):
    throttle_scope = "password-reset-request"

    @extend_schema(
        request=s.ResetRequestSerializer, responses={202: s.MessageSerializer}
    )
    def post(self, request):
        data = validated(s.ResetRequestSerializer, request.data)
        request_password_reset(data["email"])
        return Response(
            {"message": "Se a conta estiver apta, enviaremos instruções."}, status=202
        )


class PasswordResetConfirmView(PublicThrottledView):
    throttle_scope = "password-reset-confirm"

    @extend_schema(request=s.ConfirmResetSerializer, responses={204: None})
    def post(self, request):
        data = validated(s.ConfirmResetSerializer, request.data)
        confirm_password_reset(data["token"], data["password"])
        return Response(status=204)


class RequestInstitutionView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = InstitutionRequestSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "institution-request"

    def perform_create(self, serializer):
        serializer.instance = create_institution_request(**serializer.validated_data)


class InstitutionReviewViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.ReviewedInstitutionSerializer
    lookup_value_converter = "uuid"

    def get_queryset(self):
        internal_operator(self.request.user, REVIEW_PERMISSION)
        return InstitutionRequest.objects.order_by("-created_at", "id")

    @extend_schema(
        request=s.ApproveInstitutionSerializer,
        responses=s.ReviewedInstitutionSerializer,
    )
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        internal_operator(request.user, REVIEW_PERMISSION)
        data = validated(s.ApproveInstitutionSerializer, request.data)
        return Response(
            self.get_serializer(
                review_institution(request.user, pk, approve=True, **data)
            ).data
        )

    @extend_schema(
        request=s.RejectInstitutionSerializer, responses=s.ReviewedInstitutionSerializer
    )
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        internal_operator(request.user, REVIEW_PERMISSION)
        data = validated(s.RejectInstitutionSerializer, request.data)
        application = review_institution(
            request.user, pk, approve=False, reason=data["rejection_reason"]
        )
        return Response(self.get_serializer(application).data)


class DirectProvisionView(APIView):
    @extend_schema(
        request=s.DirectProvisionSerializer, responses={201: s.ProvisionedSerializer}
    )
    def post(self, request):
        internal_operator(request.user, REVIEW_PERMISSION)
        data = validated(s.DirectProvisionSerializer, request.data)
        organization, invite = direct_provision(request.user, **data)
        return Response(
            {"organization": organization.pk, "initial_invitation": invite.pk},
            status=201,
        )


class InitialInvitationView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation-management"

    @extend_schema(request=None, responses=s.InvitationSerializer)
    def post(self, request, pk, operation):
        internal_operator(request.user, REVIEW_PERMISSION)
        invite = update_invitation(pk, operation, internal_user=request.user)
        invite.refresh_from_db()
        return Response(s.InvitationSerializer(invite).data)


class RecoverDirectorView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation-management"

    @extend_schema(
        request=s.ResetRequestSerializer, responses={201: s.InvitationSerializer}
    )
    def post(self, request, pk):
        internal_operator(request.user, REVIEW_PERMISSION)
        data = validated(s.ResetRequestSerializer, request.data)
        invite = recover_director_invitation(request.user, pk, data["email"])
        invite.refresh_from_db()
        return Response(s.InvitationSerializer(invite).data, status=201)


class AdministerAccountView(APIView):
    @extend_schema(request=None, responses={204: None})
    def post(self, request, pk, operation):
        internal_operator(request.user, ACCOUNT_PERMISSION)
        administer_account(request.user, pk, deactivate=operation == "deactivate")
        return Response(status=204)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class InvitationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.InvitationSerializer
    lookup_value_converter = "uuid"
    pagination_class = None
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation-management"

    def get_queryset(self):
        return manageable_invitations(staff_context(self.request)).prefetch_related(
            "schools"
        )

    def list(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.get_queryset()[:100], many=True).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.InviteSerializer,
        responses={201: s.InvitationSerializer},
    )
    def create(self, request):
        actor = staff_context(request)
        data = validated(s.InviteSerializer, request.data)
        invite = invite_employee(actor, **data)
        invite.refresh_from_db()
        return Response(self.get_serializer(invite).data, status=201)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], request=None, responses=s.InvitationSerializer
    )
    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        invite = update_invitation(pk, "revoke", actor=staff_context(request))
        return Response(self.get_serializer(invite).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], request=None, responses=s.InvitationSerializer
    )
    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        invite = update_invitation(pk, "resend", actor=staff_context(request))
        invite.refresh_from_db()
        return Response(self.get_serializer(invite).data)


class VerifyInvitationView(PublicThrottledView):
    throttle_scope = "invitation-activation"

    @extend_schema(
        request=s.TokenSerializer,
        responses=inline_serializer(
            "InvitationVerification", fields={"valid": serializers.BooleanField()}
        ),
    )
    def post(self, request):
        data = validated(s.TokenSerializer, request.data)
        invitation_schools(valid_invitation(data["token"]))
        return Response({"valid": True})


class ActivateInvitationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation-activation"
    serializer_class = s.ActivateSerializer

    @extend_schema(request=s.ActivateSerializer, responses=s.MessageSerializer)
    def post(self, request):
        data = validated(self.serializer_class, request.data)
        data.pop("password_confirmation", None)
        accept_invitation(request.user, **data)
        return Response({"message": "Convite aceito."})


class LegacyActivateInvitationView(ActivateInvitationView):
    serializer_class = s.LegacyActivateSerializer

    @extend_schema(
        request=s.LegacyActivateSerializer,
        responses=s.MessageSerializer,
        deprecated=True,
    )
    def post(self, request):
        return super().post(request)


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER, s.MembershipFilterSerializer]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MembershipSerializer
    lookup_value_converter = "uuid"

    def get_queryset(self):
        actor = staff_context(self.request)
        memberships = manageable_memberships(actor)
        if self.action != "list":
            return memberships
        filters = validated(
            s.MembershipFilterSerializer, self.request.query_params.dict()
        )
        if "organization" in filters:
            memberships = memberships.filter(organization_id=filters["organization"])
        if "school" in filters:
            school = schools_for(actor).filter(pk=filters["school"]).first()
            if not school:
                return memberships.none()
            memberships = memberships.filter(
                Q(all_schools_access=True) | Q(school_accesses__school=school)
            )
        if "role" in filters:
            role = canonical_role(filters["role"])
            memberships = memberships.filter(
                role__in=DIRECTORS if role in DIRECTORS else [role]
            )
        if "is_active" in filters:
            memberships = memberships.filter(is_active=filters["is_active"])
        return memberships

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.RoleUpdateSerializer,
        responses=MembershipSerializer,
    )
    def partial_update(self, request, pk=None):
        data = validated(s.RoleUpdateSerializer, request.data)
        membership = update_membership(staff_context(request), pk, **data)
        return Response(self.get_serializer(membership).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], request=None, responses=MembershipSerializer
    )
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        membership = update_membership(staff_context(request), pk, is_active=False)
        return Response(self.get_serializer(membership).data)

    @extend_schema(
        parameters=[ORGANIZATION_HEADER], request=None, responses=MembershipSerializer
    )
    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        membership = update_membership(staff_context(request), pk, is_active=True)
        return Response(self.get_serializer(membership).data)

    @extend_schema(parameters=[ORGANIZATION_HEADER], responses=s.SchoolGrantSerializer)
    @action(detail=True, methods=["get"])
    def schools(self, request, pk=None):
        return self.school_grant_response(self.get_object())

    @extend_schema(
        parameters=[ORGANIZATION_HEADER],
        request=s.SchoolGrantSerializer,
        responses=s.SchoolGrantSerializer,
    )
    @schools.mapping.put
    def replace_schools(self, request, pk=None):
        grant = validated(s.SchoolGrantSerializer, request.data)
        membership = update_membership(staff_context(request), pk, grant=grant)
        return self.school_grant_response(membership)

    @staticmethod
    def school_grant_response(membership):
        return Response(
            {
                "all_schools_access": membership.all_schools_access,
                "school_ids": list(
                    membership.school_accesses.order_by("school_id").values_list(
                        "school_id", flat=True
                    )
                ),
            }
        )
