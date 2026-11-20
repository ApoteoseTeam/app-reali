from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ChatView, ConversationViewSet, MessagesView, UsageView

router = SimpleRouter(use_regex_path=False)
router.register("conversations", ConversationViewSet, basename="ai-conversations")

urlpatterns = [
    path("chat/", ChatView.as_view()),
    path("usage/", UsageView.as_view()),
    path("conversations/<uuid:pk>/messages/", MessagesView.as_view()),
    path("", include(router.urls)),
]
