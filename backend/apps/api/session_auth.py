import uuid

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
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken, Token, UntypedToken

from apps.notifications.devices import revoke_session_devices
from apps.users.models import User, normalize_email

from .serializers import UserSerializer
from .session_revocations import SESSION_ID_CLAIM, is_revoked, record_revocation

SESSION_CLAIM = "session_version"


def refresh_session_id(token):
    return token.get(SESSION_ID_CLAIM) or str(
        uuid.uuid5(uuid.NAMESPACE_OID, str(token[api_settings.JTI_CLAIM]))
    )


class SessionAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get(SESSION_CLAIM, 0) != user.session_version or is_revoked(
            validated_token.get(SESSION_ID_CLAIM)
        ):
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
        token[SESSION_ID_CLAIM] = str(uuid.uuid4())
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


class PushRefreshToken(RefreshToken):
    @property
    def access_token(self):
        # Old refresh tokens acquire a stable push session on their first rotation.
        if SESSION_ID_CLAIM not in self:
            self[SESSION_ID_CLAIM] = refresh_session_id(self)
        return super().access_token


class RefreshSerializer(TokenRefreshSerializer):
    token_class = PushRefreshToken

    @transaction.atomic
    def validate(self, attrs):
        user, token = lock_refresh_user(attrs["refresh"])
        if (
            not user
            or not user.is_active
            or token.get(SESSION_CLAIM, 0) != user.session_version
            or is_revoked(refresh_session_id(token))
        ):
            raise InvalidToken("Sessão inválida ou revogada.")
        # This second validation checks blacklist state after concurrent rotations complete.
        return super().validate(attrs)


class LogoutRefreshToken(RefreshToken):
    def verify(self):
        # A rotated refresh can still end its own session. Retain signature,
        # expiration, identifier and token-type verification.
        Token.verify(self)


class LogoutSerializer(TokenBlacklistSerializer):
    token_class = LogoutRefreshToken

    @transaction.atomic
    def validate(self, attrs):
        user, token = lock_refresh_user(attrs["refresh"])
        data = super().validate(attrs)
        if user:
            session_id = refresh_session_id(token)
            record_revocation(session_id)
            revoke_session_devices(user, session_id)
        return data
