from base64 import b64decode, b64encode
from binascii import Error as Base64Error
from io import BytesIO

from django.utils import timezone
from PIL import Image, ImageOps
from rest_framework import serializers

from apps.users.models import Membership

from .models import UserInvitation
from .permissions import ROLE_PERMISSIONS
from .serializers import (
    InstitutionRequestSerializer,
    MembershipSerializer,
    UserSerializer,
)


class SessionSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class SessionMembershipSerializer(MembershipSerializer):
    capabilities = serializers.SerializerMethodField()

    class Meta(MembershipSerializer.Meta):
        fields = MembershipSerializer.Meta.fields + ("capabilities",)
        read_only_fields = fields

    def get_capabilities(self, membership) -> list[str]:
        return sorted(
            name for name, roles in ROLE_PERMISSIONS.items() if membership.role in roles
        )


class ProfileUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = (*UserSerializer.Meta.fields, "profile_photo")
        read_only_fields = fields


class MeSerializer(serializers.Serializer):
    user = ProfileUserSerializer()
    memberships = SessionMembershipSerializer(many=True)


class UpdateProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160, required=False)
    profile_photo = serializers.CharField(max_length=2_000_000, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Informe o nome ou a foto do perfil.")
        return attrs

    def validate_profile_photo(self, value):
        try:
            with Image.open(
                BytesIO(b64decode(value, validate=True)),
                formats=("JPEG", "PNG", "WEBP"),
            ) as image:
                if image.width * image.height > 20_000_000:
                    raise serializers.ValidationError(
                        "A foto tem resolução muito alta."
                    )
                image.thumbnail((384, 384))
                photo = ImageOps.exif_transpose(image).convert("RGB")
                photo.info.clear()
                output = BytesIO()
                photo.save(output, format="JPEG", quality=85)
        except (Base64Error, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise serializers.ValidationError(
                "Selecione uma imagem JPEG, PNG ou WebP válida."
            ) from exc
        return b64encode(output.getvalue()).decode("ascii")


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=256, write_only=True)


class PasswordInput(serializers.CharField):
    def __init__(self, **kwargs):
        super().__init__(
            write_only=True, trim_whitespace=False, max_length=256, **kwargs
        )


class PasswordPairSerializer(serializers.Serializer):
    password = PasswordInput(min_length=12)
    password_confirmation = PasswordInput()

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirmation"):
            raise serializers.ValidationError(
                {"password_confirmation": "As senhas devem coincidir."}
            )
        return attrs


class ChangePasswordSerializer(PasswordPairSerializer):
    current_password = PasswordInput()


class ConfirmResetSerializer(TokenSerializer, PasswordPairSerializer):
    pass


class ResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ActivateSerializer(TokenSerializer, PasswordPairSerializer):
    full_name = serializers.CharField(max_length=160, required=False)
    password = PasswordInput(min_length=12, required=False)
    password_confirmation = PasswordInput(required=False)


class LegacyActivateSerializer(ActivateSerializer):
    def validate(self, attrs):
        if "password" in attrs:
            attrs.setdefault("password_confirmation", attrs["password"])
        return super().validate(attrs)


class SchoolGrantSerializer(serializers.Serializer):
    school_ids = serializers.ListField(child=serializers.UUIDField(), max_length=200)
    all_schools_access = serializers.BooleanField()

    def validate_school_ids(self, ids):
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Os IDs de escola devem ser únicos.")
        return ids


class InviteSerializer(SchoolGrantSerializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices)
    school_ids = serializers.ListField(
        child=serializers.UUIDField(), max_length=200, required=False, default=list
    )
    all_schools_access = serializers.BooleanField(required=False, default=False)


class InvitationSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    school_ids = serializers.PrimaryKeyRelatedField(
        source="schools", many=True, read_only=True
    )

    class Meta:
        model = UserInvitation
        fields = (
            "id",
            "organization",
            "email",
            "role",
            "invited_by",
            "school_ids",
            "all_schools_access",
            "status",
            "expires_at",
            "accepted_at",
            "revoked_at",
            "created_at",
            "delivery_status",
            "last_sent_at",
        )
        read_only_fields = fields

    def get_status(self, invite) -> str:
        if (
            invite.status == UserInvitation.Status.PENDING
            and invite.expires_at <= timezone.now()
        ):
            return UserInvitation.Status.EXPIRED
        return invite.status


class ReviewedInstitutionSerializer(InstitutionRequestSerializer):
    class Meta(InstitutionRequestSerializer.Meta):
        fields = InstitutionRequestSerializer.Meta.fields + (
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "organization",
            "initial_invitation",
        )
        read_only_fields = fields


class ProvisionSchoolSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160)
    code = serializers.CharField(max_length=40)
    address = serializers.CharField(max_length=250, allow_blank=True, required=False)
    city = serializers.CharField(max_length=100, allow_blank=True, required=False)
    state = serializers.CharField(max_length=2, allow_blank=True, required=False)
    zip_code = serializers.CharField(max_length=9, allow_blank=True, required=False)


class ApproveInstitutionSerializer(serializers.Serializer):
    schools = ProvisionSchoolSerializer(many=True, allow_empty=False, max_length=200)
    director_email = serializers.EmailField(required=False)

    def validate_schools(self, schools):
        if len({school["code"] for school in schools}) != len(schools):
            raise serializers.ValidationError("Cada código de escola deve ser único.")
        return schools


class DirectProvisionSerializer(ApproveInstitutionSerializer):
    name = serializers.CharField(max_length=160)
    email = serializers.EmailField(required=False, default="")
    phone = serializers.CharField(
        max_length=30, allow_blank=True, required=False, default=""
    )
    director_email = serializers.EmailField()


class ProvisionedSerializer(serializers.Serializer):
    organization = serializers.UUIDField()
    initial_invitation = serializers.UUIDField()


class RejectInstitutionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(max_length=2000)


class RoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Membership.Role.choices)


class MembershipFilterSerializer(serializers.Serializer):
    organization = serializers.UUIDField(required=False)
    school = serializers.UUIDField(required=False)
    role = serializers.ChoiceField(choices=Membership.Role.choices, required=False)
    is_active = serializers.BooleanField(required=False)
