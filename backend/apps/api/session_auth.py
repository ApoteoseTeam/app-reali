from django.db import transaction
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (
    TokenBlacklistSerializer,
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import UntypedToken

from apps.users.models import User, normalize_email

from .serializers import UserSerializer

SESSION_CLAIM = "session_version"


class SessionAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get(SESSION_CLAIM, 0) != user.session_version:
            raise AuthenticationFailed("Sessão revogada.", code="session_revoked")
        return user


class SessionAuthenticationSchema(OpenApiAuthenticationExtension):
    target_class = SessionAuthentication
    name = "jwtAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}


class LoginSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["password"].trim_whitespace = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token[SESSION_CLAIM] = user.session_version
        return token

    def validate(self, attrs):
        attrs["email"] = normalize_email(attrs["email"])
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


def lock_refresh_user(raw_token):
    # Read the verified user claim before acquiring the same lock used by password changes.
    token = UntypedToken(raw_token)
    user_id = token.get("user_id")
    if (
        not isinstance(user_id, (str, int))
        or not str(user_id).isascii()
        or not str(user_id).isdigit()
    ):
        raise InvalidToken("Sessão inválida.")
    user_id = int(user_id)
    if not 0 < user_id <= 2**63 - 1:
        raise InvalidToken("Sessão inválida.")
    user = User.objects.select_for_update().filter(pk=user_id).first()
    return user, token


class RefreshSerializer(TokenRefreshSerializer):
    @transaction.atomic
    def validate(self, attrs):
        user, token = lock_refresh_user(attrs["refresh"])
        if (
            not user
            or not user.is_active
            or token.get(SESSION_CLAIM, 0) != user.session_version
        ):
            raise InvalidToken("Sessão inválida ou revogada.")
        # This second validation checks blacklist state after concurrent rotations complete.
        return super().validate(attrs)


class LogoutSerializer(TokenBlacklistSerializer):
    @transaction.atomic
    def validate(self, attrs):
        lock_refresh_user(attrs["refresh"])
        return super().validate(attrs)
