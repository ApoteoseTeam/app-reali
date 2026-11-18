from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from .views import (
    RequestInstitutionView,
    MeView,
    OrganizationsView,
    SchoolViewSet,
    CameraViewSet,
    MealServiceViewSet,
    StudentCountView,
    PlateCountView,
    DailyMetricsView,
    RebuildMetricsView,
    MembershipsView,
    InvitationsView,
    AcceptInvitationView,
    CameraHeartbeatView,
    DeviceCountsView,
    LoginView,
)

router = DefaultRouter(use_regex_path=False)
router.register("schools", SchoolViewSet, basename="schools")
router.register("cameras", CameraViewSet, basename="cameras")
router.register("meal-services", MealServiceViewSet, basename="meal-services")
urlpatterns = [
    path("auth/login/", LoginView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/logout/", TokenBlacklistView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("institution-requests/", RequestInstitutionView.as_view()),
    path("auth/activate/", AcceptInvitationView.as_view()),
    path("organizations/", OrganizationsView.as_view()),
    path("memberships/", MembershipsView.as_view()),
    path("invitations/", InvitationsView.as_view()),
    path("student-counts/", StudentCountView.as_view()),
    path("plate-counts/", PlateCountView.as_view()),
    path("analytics/daily/", DailyMetricsView.as_view()),
    path("analytics/rebuild/", RebuildMetricsView.as_view()),
    path("device/heartbeat/", CameraHeartbeatView.as_view()),
    path("device/counts/", DeviceCountsView.as_view()),
    path("", include(router.urls)),
]
