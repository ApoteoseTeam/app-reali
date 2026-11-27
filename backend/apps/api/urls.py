from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.analytics.views import (
    DailyMetricsView,
    DashboardView,
    ExportView,
    HistoryView,
    MealMetricsView,
    OrganizationSummaryView,
    RebuildMetricsView,
    SchoolComparisonView,
)
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

from apps.meals.views import (
    ForecastListView,
    ForecastPolicyViewSet,
    MealServiceViewSet,
    ScheduleViewSet,
)
from apps.notifications.views import AuditViewSet, InboxViewSet, PlatformAuditViewSet, PreferenceView, PushDeviceViewSet

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
    RecoverManagerView,
    VerifyInvitationView,
)
from .views import OrganizationsView, SchoolViewSet

router = DefaultRouter(use_regex_path=False)
router.register("notifications/push-devices", PushDeviceViewSet, basename="notification-push-devices")
router.register("notifications", InboxViewSet, basename="notifications")
router.register("audit-logs", AuditViewSet, basename="audit-logs")
router.register("admin/audit-logs", PlatformAuditViewSet, basename="platform-audit-logs")
router.register("analytics/daily", DailyMetricsView, basename="analytics-daily")
router.register(
    "analytics/meal-services", MealMetricsView, basename="analytics-meal-services"
)
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
router.register("meal-schedules", ScheduleViewSet, basename="meal-schedules")
router.register(
    "meal-forecast-policies", ForecastPolicyViewSet, basename="meal-forecast-policies"
)
router.register("memberships", MembershipViewSet, basename="memberships")
router.register("invitations", InvitationViewSet, basename="invitations")
router.register(
    "admin/institution-requests",
    InstitutionReviewViewSet,
    basename="institution-requests-admin",
)

urlpatterns = [
    path("notifications/preferences/", PreferenceView.as_view()),
    path("ai/", include("apps.ai.urls")),
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
        RecoverManagerView.as_view(),
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
    path("meal-forecasts/", ForecastListView.as_view()),
    path("student-counts/", StudentCountView.as_view()),
    path("plate-counts/", PlateCountView.as_view()),
    path("student-counts/summary/", StudentSummaryView.as_view()),
    path("plate-counts/summary/", PlateSummaryView.as_view()),
    path("analytics/daily/rebuild/", RebuildMetricsView.as_view()),
    path("analytics/dashboard/", DashboardView.as_view()),
    path("analytics/history/", HistoryView.as_view()),
    path("analytics/history/daily/", HistoryView.as_view(group="daily")),
    path("analytics/history/weekly/", HistoryView.as_view(group="weekly")),
    path("analytics/history/monthly/", HistoryView.as_view(group="monthly")),
    path("analytics/organizations/summary/", OrganizationSummaryView.as_view()),
    path("analytics/schools/comparison/", SchoolComparisonView.as_view()),
    path("analytics/reports/export/", ExportView.as_view()),
    path("analytics/rebuild/", RebuildMetricsView.as_view()),
    path("device/heartbeat/", DeviceHeartbeatView.as_view()),
    path("device/configuration/", DeviceConfigurationView.as_view()),
    path("device/counts/", DeviceCountsView.as_view()),
    path("device/counts/batch/", DeviceCountBatchView.as_view()),
    path("", include(router.urls)),
]
