from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.cameras.views import (
    CameraViewSet,
    DeviceConfigurationView,
    DeviceHeartbeatView,
    EdgeDeviceViewSet,
    SupportCameraViewSet,
    SupportEdgeDeviceViewSet,
)

from apps.counting.views import (
    CountAdjustmentViewSet,
    DeviceCountBatchView,
    DeviceCountsView,
    PlateCountView,
    PlateSummaryView,
    StudentCountView,
    StudentSummaryView,
)

from .access_views import (
    ActivateInvitationView,
    AdministerAccountView,
    ChangePasswordView,
    DirectProvisionView,
    InitialInvitationView,
    InstitutionReviewViewSet,
    InvitationViewSet,
    LegacyActivateInvitationView,
    LoginView,
    LogoutView,
    MembershipViewSet,
    MeView,
    MySchoolsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshView,
    RequestInstitutionView,
    RecoverDirectorView,
    VerifyInvitationView,
)
from .views import (
    DailyMetricsView,
    MealServiceViewSet,
    OrganizationsView,
    RebuildMetricsView,
    SchoolViewSet,
)

router = DefaultRouter(use_regex_path=False)
router.register("schools", SchoolViewSet, basename="schools")
router.register("cameras", CameraViewSet, basename="cameras")
router.register(
    "count-adjustments", CountAdjustmentViewSet, basename="count-adjustments"
)
router.register("edge-devices", EdgeDeviceViewSet, basename="edge-devices")
router.register("admin/cameras", SupportCameraViewSet, basename="support-cameras")
router.register(
    "admin/edge-devices", SupportEdgeDeviceViewSet, basename="support-edge-devices"
)
router.register("meal-services", MealServiceViewSet, basename="meal-services")
router.register("memberships", MembershipViewSet, basename="memberships")
router.register("invitations", InvitationViewSet, basename="invitations")
router.register(
    "admin/institution-requests",
    InstitutionReviewViewSet,
    basename="institution-requests-admin",
)

urlpatterns = [
    path("auth/login/", LoginView.as_view()),
    path("auth/refresh/", RefreshView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("auth/me/schools/", MySchoolsView.as_view()),
    path("auth/change-password/", ChangePasswordView.as_view()),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view()),
    path("auth/invitations/verify/", VerifyInvitationView.as_view()),
    path("auth/invitations/activate/", ActivateInvitationView.as_view()),
    path("auth/activate/", LegacyActivateInvitationView.as_view()),
    path("institution-requests/", RequestInstitutionView.as_view()),
    path("admin/organizations/provision/", DirectProvisionView.as_view()),
    path(
        "admin/organizations/<uuid:pk>/initial-invitation/",
        RecoverDirectorView.as_view(),
    ),
    path(
        "admin/initial-invitations/<uuid:pk>/resend/",
        InitialInvitationView.as_view(),
        {"operation": "resend"},
    ),
    path(
        "admin/initial-invitations/<uuid:pk>/revoke/",
        InitialInvitationView.as_view(),
        {"operation": "revoke"},
    ),
    path(
        "admin/users/<int:pk>/revoke-sessions/",
        AdministerAccountView.as_view(),
        {"operation": "revoke"},
    ),
    path(
        "admin/users/<int:pk>/deactivate/",
        AdministerAccountView.as_view(),
        {"operation": "deactivate"},
    ),
    path("organizations/", OrganizationsView.as_view()),
    path("student-counts/", StudentCountView.as_view()),
    path("plate-counts/", PlateCountView.as_view()),
    path("student-counts/summary/", StudentSummaryView.as_view()),
    path("plate-counts/summary/", PlateSummaryView.as_view()),
    path("analytics/daily/", DailyMetricsView.as_view()),
    path("analytics/rebuild/", RebuildMetricsView.as_view()),
    path("device/heartbeat/", DeviceHeartbeatView.as_view()),
    path("device/configuration/", DeviceConfigurationView.as_view()),
    path("device/counts/", DeviceCountsView.as_view()),
    path("device/counts/batch/", DeviceCountBatchView.as_view()),
    path("", include(router.urls)),
]
