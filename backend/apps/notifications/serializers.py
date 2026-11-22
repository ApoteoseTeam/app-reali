from rest_framework import serializers

from apps.api.models import AuditLog
from apps.cameras.serializers import StrictSerializer

from .models import Kind, Notification, PushDevice
from .services import POLICIES


class ScopeFilters(StrictSerializer):
    school_id = serializers.UUIDField(required=False)


class InboxFilters(ScopeFilters):
    unread = serializers.BooleanField(required=False)
    archived = serializers.BooleanField(default=False)
    type = serializers.ChoiceField(choices=Kind.choices, required=False)
    page = serializers.CharField(required=False)
    format = serializers.CharField(required=False)


class NotificationSerializer(serializers.ModelSerializer):
    data = serializers.SerializerMethodField()
    notification_type = serializers.ChoiceField(
        source="kind", choices=Kind.choices, read_only=True
    )
    type_label = serializers.CharField(source="get_kind_display", read_only=True)
    school_name = serializers.CharField(
        source="school.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "organization",
            "school",
            "school_name",
            "notification_type",
            "type_label",
            "title",
            "message",
            "priority",
            "data",
            "created_at",
            "read_at",
            "archived_at",
        )
        read_only_fields = fields

    def get_data(self, _row) -> dict:
        # Only the detail action resolves the destination against the current scope.
        return {}


class UnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField()


class ReadAllSerializer(serializers.Serializer):
    updated = serializers.IntegerField()


class PreferencePatchSerializer(StrictSerializer):
    notification_type = serializers.ChoiceField(choices=Kind.choices)
    in_app = serializers.BooleanField(required=False)
    push = serializers.BooleanField(required=False)
    email = serializers.BooleanField(required=False)

    def validate(self, attrs):
        policy = POLICIES[attrs["notification_type"]]
        if len(attrs) == 1:
            raise serializers.ValidationError("Informe pelo menos um canal.")
        if attrs.get("in_app") is False and policy.required:
            raise serializers.ValidationError(
                {"in_app": "Esta comunicação da conta é obrigatória."}
            )
        if attrs.get("email") and not policy.email:
            raise serializers.ValidationError(
                {"email": "Canal indisponível para este tipo."}
            )
        if attrs.get("push") and not policy.push:
            raise serializers.ValidationError(
                {"push": "Canal indisponível para este tipo."}
            )
        return attrs


class PreferenceSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=Kind.choices)
    label = serializers.CharField()
    in_app = serializers.BooleanField()
    push = serializers.BooleanField()
    email = serializers.BooleanField()
    required_in_app = serializers.BooleanField()
    push_available = serializers.BooleanField()
    email_available = serializers.BooleanField()


class PushRegistrationSerializer(StrictSerializer):
    installation = serializers.UUIDField()
    installation_secret = serializers.RegexField(r"\A[0-9a-f]{64}\Z", write_only=True)
    push_token = serializers.RegexField(
        r"\A(?:ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{8,200}\]\Z",
        write_only=True,
    )
    platform = serializers.ChoiceField(choices=PushDevice.Platform.choices)


class PushDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushDevice
        fields = ("id", "platform", "is_active", "last_registered_at")
        read_only_fields = fields


class AuditFilters(ScopeFilters):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    organization_id = serializers.UUIDField(required=False)
    actor_id = serializers.IntegerField(
        min_value=1, max_value=2**63 - 1, required=False
    )
    action = serializers.RegexField(r"\A[A-Z][A-Z_]{1,49}\Z", required=False)
    target_type = serializers.RegexField(r"\A[a-z][a-z0-9_.]{0,63}\Z", required=False)
    target_id = serializers.RegexField(r"\A[a-zA-Z0-9_-]{1,64}\Z", required=False)
    page = serializers.CharField(required=False)
    format = serializers.CharField(required=False)

    def validate(self, attrs):
        start, end = attrs.get("start_date"), attrs.get("end_date")
        if start and end and start > end:
            raise serializers.ValidationError(
                {"end_date": "O fim deve ser igual ou posterior ao início."}
            )
        return attrs


class AuditSerializer(serializers.ModelSerializer):
    target_id = serializers.CharField(source="object_id")
    occurred_at = serializers.DateTimeField(source="created_at")
    metadata = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "organization",
            "school",
            "action",
            "target_type",
            "target_id",
            "metadata",
            "occurred_at",
            "request_id",
        )
        read_only_fields = fields

    def get_metadata(self, entry) -> dict:
        allowed = {
            "delta",
            "reversal_of",
            "day",
            "format",
            "previous_status",
            "status",
            "previous_role",
            "role",
            "channel",
            "notification_type",
            "method",
            "route",
            "version",
        }
        return {
            key: value
            for key, value in entry.details.items()
            if key in allowed and (value is None or type(value) in {int, str, bool})
        }
