import math

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from apps.api.serializers import ActiveSchoolField

from .models import (
    Camera,
    CameraConfiguration,
    CameraHealthEvent,
    DetectorStatus,
    DeviceCredential,
    EdgeDevice,
    OperationalStatus,
    VideoStatus,
)
from .monitoring import agent_status, classify_sample, operational_status


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict) and set(data) - set(self.fields):
            raise serializers.ValidationError(
                {"non_field_errors": ["O corpo contém campos não reconhecidos."]}
            )
        return super().to_internal_value(data)


class FiniteFloatField(serializers.FloatField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not math.isfinite(value):
            raise serializers.ValidationError("Informe um número finito.")
        return value


class ExplicitTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        if isinstance(value, str):
            try:
                parsed = parse_datetime(value)
            except ValueError:
                parsed = None
            if parsed is not None and timezone.is_naive(parsed):
                raise serializers.ValidationError(
                    "Informe o fuso horário no timestamp."
                )
        return super().to_internal_value(value)


class EdgeDeviceField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        schools = self.context.get("authorized_schools")
        if schools is None:
            return EdgeDevice.objects.none()
        return EdgeDevice.objects.filter(
            school__in=schools, school__is_active=True, is_active=True
        )


class CameraSummarySerializer(serializers.ModelSerializer):
    operational_status = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = (
            "id",
            "school",
            "name",
            "camera_type",
            "location",
            "is_active",
            "last_seen_at",
            "operational_status",
        )
        read_only_fields = fields

    def get_operational_status(self, camera) -> OperationalStatus:
        return operational_status(camera, timezone.now())


class CameraSerializer(CameraSummarySerializer):
    school = ActiveSchoolField()
    edge_device = EdgeDeviceField(required=False, allow_null=True)

    class Meta(CameraSummarySerializer.Meta):
        fields = CameraSummarySerializer.Meta.fields + ("edge_device",)
        read_only_fields = ("id", "last_seen_at", "operational_status")


class CameraFilterSerializer(serializers.Serializer):
    school = serializers.UUIDField(required=False)
    camera_type = serializers.ChoiceField(
        choices=Camera.CameraType.choices, required=False
    )
    is_active = serializers.BooleanField(required=False)


class CameraStatusSerializer(CameraSummarySerializer):
    agent_status = serializers.SerializerMethodField()
    status_reason = serializers.SerializerMethodField(allow_null=True)

    class Meta(CameraSummarySerializer.Meta):
        fields = CameraSummarySerializer.Meta.fields + (
            "edge_device",
            "agent_status",
            "video_status",
            "detector_status",
            "processing_fps",
            "pending_events",
            "status_reason",
        )
        read_only_fields = fields

    def get_agent_status(self, camera) -> str:
        return agent_status(camera.edge_device, timezone.now())

    def get_status_reason(self, camera) -> str | None:
        status = operational_status(camera, timezone.now())
        if status == OperationalStatus.UNKNOWN:
            return None
        if status == OperationalStatus.OFFLINE:
            return "timeout"
        return classify_sample(camera)[1]


class EdgeDeviceSerializer(serializers.ModelSerializer):
    school = ActiveSchoolField()
    connection_status = serializers.SerializerMethodField()

    class Meta:
        model = EdgeDevice
        fields = (
            "id",
            "school",
            "name",
            "device_identifier",
            "is_active",
            "last_seen_at",
            "agent_version",
            "connection_status",
        )
        read_only_fields = (
            "id",
            "device_identifier",
            "last_seen_at",
            "agent_version",
            "connection_status",
        )

    def get_connection_status(self, device) -> str:
        return agent_status(device, timezone.now())


class DeviceCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceCredential
        fields = (
            "id",
            "edge_device",
            "token_prefix",
            "is_active",
            "created_at",
            "expires_at",
            "revoked_at",
            "last_used_at",
        )
        read_only_fields = fields


class IssuedCredentialSerializer(DeviceCredentialSerializer):
    token = serializers.CharField(read_only=True)

    class Meta(DeviceCredentialSerializer.Meta):
        fields = DeviceCredentialSerializer.Meta.fields + ("token",)
        read_only_fields = fields


class ReauthenticateSerializer(serializers.Serializer):
    password = serializers.CharField(
        max_length=1024, trim_whitespace=False, write_only=True
    )


class CredentialInputSerializer(ReauthenticateSerializer):
    expires_at = ExplicitTimeField(required=False, allow_null=True)


class CameraHealthEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraHealthEvent
        fields = (
            "id",
            "camera",
            "event_type",
            "previous_status",
            "new_status",
            "message",
            "occurred_at",
            "created_at",
        )
        read_only_fields = fields


class PointSerializer(StrictSerializer):
    x = FiniteFloatField(min_value=0, max_value=1)
    y = FiniteFloatField(min_value=0, max_value=1)


class LineSerializer(StrictSerializer):
    start = PointSerializer()
    end = PointSerializer()
    direction = serializers.ChoiceField(
        choices=("NEGATIVE_TO_POSITIVE", "POSITIVE_TO_NEGATIVE")
    )

    def validate(self, attrs):
        if attrs["start"] == attrs["end"]:
            raise serializers.ValidationError(
                "A linha precisa de dois pontos diferentes."
            )
        return attrs


class RegionSerializer(StrictSerializer):
    top_left = PointSerializer()
    bottom_right = PointSerializer()

    def validate(self, attrs):
        first, last = attrs["top_left"], attrs["bottom_right"]
        if first["x"] >= last["x"] or first["y"] >= last["y"]:
            raise serializers.ValidationError(
                "A região precisa ter largura e altura positivas."
            )
        return attrs


class TrackerSerializer(StrictSerializer):
    track_buffer_frames = serializers.IntegerField(min_value=1, max_value=10000)
    match_threshold = FiniteFloatField(min_value=0, max_value=1)


class CameraParametersSerializer(StrictSerializer):
    event_kind = serializers.ChoiceField(choices=("STUDENT_ENTRY", "PLATE_DELIVERY"))
    trigger = serializers.ChoiceField(choices=("LINE_CROSSING", "DELIVERY_ZONE"))
    desired_fps = FiniteFloatField(min_value=0.1, max_value=240)
    confidence_threshold = FiniteFloatField(min_value=0, max_value=1)
    algorithm_version = serializers.RegexField(
        r"\A[A-Za-z0-9][A-Za-z0-9_.+-]{0,49}\Z", max_length=50
    )
    region_of_interest = RegionSerializer(required=False)
    counting_line = LineSerializer(required=False)
    tracker = TrackerSerializer(required=False)

    def validate(self, attrs):
        line_crossing = attrs["trigger"] == "LINE_CROSSING"
        if line_crossing != ("counting_line" in attrs):
            raise serializers.ValidationError(
                {"counting_line": "Use uma linha apenas com LINE_CROSSING."}
            )
        if not line_crossing and "region_of_interest" not in attrs:
            raise serializers.ValidationError(
                {"region_of_interest": "DELIVERY_ZONE exige uma região."}
            )
        if attrs["event_kind"] == "STUDENT_ENTRY" and not line_crossing:
            raise serializers.ValidationError(
                {"trigger": "Portaria exige uma linha de entrada direcional."}
            )
        camera = self.context.get("camera")
        if camera is not None:
            expected = (
                "STUDENT_ENTRY"
                if camera.camera_type == Camera.CameraType.ENTRANCE
                else "PLATE_DELIVERY"
            )
            if attrs["event_kind"] != expected:
                raise serializers.ValidationError(
                    {"event_kind": "O evento precisa corresponder ao tipo da câmera."}
                )
        if line_crossing and "region_of_interest" in attrs:
            region = attrs["region_of_interest"]
            for point in (
                attrs["counting_line"]["start"],
                attrs["counting_line"]["end"],
            ):
                if not all(
                    region["top_left"][axis]
                    <= point[axis]
                    <= region["bottom_right"][axis]
                    for axis in ("x", "y")
                ):
                    raise serializers.ValidationError(
                        {"counting_line": "A linha deve estar dentro da região."}
                    )
        return attrs


class CameraConfigurationSerializer(serializers.ModelSerializer):
    parameters = CameraParametersSerializer(read_only=True)

    class Meta:
        model = CameraConfiguration
        fields = ("version", "updated_at", "parameters")
        read_only_fields = fields


class HeartbeatCameraSerializer(StrictSerializer):
    camera_id = serializers.UUIDField()
    video_status = serializers.ChoiceField(choices=VideoStatus.choices)
    detector_status = serializers.ChoiceField(choices=DetectorStatus.choices)
    processing_fps = FiniteFloatField(min_value=0, max_value=1000)
    pending_events = serializers.IntegerField(min_value=0, max_value=2_147_483_647)


class HeartbeatSerializer(StrictSerializer):
    agent_version = serializers.RegexField(
        r"\A[A-Za-z0-9][A-Za-z0-9_.+-]{0,49}\Z", max_length=50
    )
    observed_at = ExplicitTimeField(required=False)
    cameras = HeartbeatCameraSerializer(many=True, max_length=100)

    def validate_cameras(self, cameras):
        if len({item["camera_id"] for item in cameras}) != len(cameras):
            raise serializers.ValidationError("Envie cada câmera apenas uma vez.")
        return cameras


class HeartbeatResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    accepted = serializers.BooleanField()
    updated_cameras = serializers.IntegerField()


class LegacyHeartbeatResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    camera_id = serializers.UUIDField()


class AssignedCameraSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    camera_type = serializers.ChoiceField(choices=Camera.CameraType.choices)
    configuration = CameraConfigurationSerializer(allow_null=True)


class DeviceConfigurationSerializer(serializers.Serializer):
    device_identifier = serializers.UUIDField()
    heartbeat_interval_seconds = serializers.IntegerField()
    cameras = AssignedCameraSerializer(many=True)
