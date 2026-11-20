from datetime import UTC

from django.conf import settings
from rest_framework import serializers

from apps.cameras.serializers import ExplicitTimeField, StrictSerializer

from .models import CountAdjustment, CountKind


class EventSerializer(StrictSerializer):
    event_id = serializers.CharField(max_length=120)
    camera_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=CountKind.choices)
    recorded_at = ExplicitTimeField(default_timezone=UTC)
    quantity = serializers.IntegerField(min_value=1, max_value=100000)
    meal_service_id = serializers.UUIDField(required=False)

    def to_internal_value(self, data):
        if (
            isinstance(data, dict)
            and "quantity" in data
            and type(data["quantity"]) is not int
        ):
            raise serializers.ValidationError(
                {"quantity": ["Informe um incremento inteiro."]}
            )
        return super().to_internal_value(data)


class BatchEnvelopeSerializer(StrictSerializer):
    events = serializers.ListField(
        child=serializers.JSONField(allow_null=True), allow_empty=False
    )

    def validate_events(self, events):
        if len(events) > settings.COUNT_BATCH_LIMIT:
            raise serializers.ValidationError(
                f"Envie até {settings.COUNT_BATCH_LIMIT} eventos."
            )
        return events


class BatchRequestSchema(serializers.Serializer):
    events = EventSerializer(many=True)


class CountErrorDetailSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    fields = serializers.JSONField(required=False)


class CountErrorSerializer(serializers.Serializer):
    error = CountErrorDetailSerializer()


class EventResultSerializer(serializers.Serializer):
    status = serializers.CharField()
    event_id = serializers.CharField()
    processed = serializers.BooleanField()
    duplicate = serializers.BooleanField()
    id = serializers.UUIDField()


class BatchResultItemSerializer(serializers.Serializer):
    index = serializers.IntegerField()
    http_status = serializers.IntegerField()
    event_id = serializers.CharField(allow_null=True)
    status = serializers.CharField(required=False)
    processed = serializers.BooleanField(required=False)
    duplicate = serializers.BooleanField(required=False)
    id = serializers.UUIDField(required=False)
    error = CountErrorDetailSerializer(required=False)


class BatchResultSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("processed", "partial", "rejected"))
    accepted = serializers.IntegerField()
    rejected = serializers.IntegerField()
    results = BatchResultItemSerializer(many=True)


class CountFiltersSerializer(serializers.Serializer):
    school = serializers.UUIDField(required=False)
    camera = serializers.UUIDField(required=False)
    date = serializers.DateField(required=False)
    start_at = ExplicitTimeField(default_timezone=UTC, required=False)
    end_at = ExplicitTimeField(default_timezone=UTC, required=False)

    def validate(self, attrs):
        if (
            attrs.get("start_at")
            and attrs.get("end_at")
            and attrs["start_at"] > attrs["end_at"]
        ):
            raise serializers.ValidationError(
                {"end_at": "O fim deve ser igual ou posterior ao início."}
            )
        return attrs


class PlateFiltersSerializer(CountFiltersSerializer):
    meal_service = serializers.UUIDField(required=False)


class CountSummarySerializer(serializers.Serializer):
    school_id = serializers.UUIDField(allow_null=True)
    reference_date = serializers.DateField(allow_null=True)
    automatic = serializers.IntegerField()
    legacy_manual = serializers.IntegerField()
    adjustment = serializers.IntegerField()
    total = serializers.IntegerField()
    last_updated = serializers.DateTimeField(allow_null=True)


class StudentSummarySerializer(CountSummarySerializer):
    student_entries = serializers.IntegerField()


class PlateSummarySerializer(CountSummarySerializer):
    served_plates = serializers.IntegerField()


class AdjustmentInputSerializer(StrictSerializer):
    event_type = serializers.ChoiceField(choices=CountKind.choices)
    count_id = serializers.UUIDField(required=False)
    camera_id = serializers.UUIDField(required=False)
    meal_service_id = serializers.UUIDField(required=False)
    recorded_at = ExplicitTimeField(default_timezone=UTC, required=False)
    delta = serializers.IntegerField(min_value=-100000, max_value=100000)
    reason = serializers.CharField(max_length=500)

    def validate(self, attrs):
        if attrs["delta"] == 0:
            raise serializers.ValidationError(
                {"delta": "Informe um ajuste diferente de zero."}
            )
        if "count_id" in attrs:
            if {"camera_id", "meal_service_id", "recorded_at"} & attrs.keys():
                raise serializers.ValidationError(
                    {
                        "count_id": "A câmera, o serviço e o horário vêm da contagem original."
                    }
                )
        else:
            if attrs["delta"] < 0 or not {"camera_id", "recorded_at"} <= attrs.keys():
                raise serializers.ValidationError(
                    {
                        "count_id": "Sem contagem original, envie incremento, câmera e horário."
                    }
                )
            if (attrs["event_type"] == CountKind.PLATE_SERVED) != (
                "meal_service_id" in attrs
            ):
                raise serializers.ValidationError(
                    {"meal_service_id": "Informe o serviço somente para pratos."}
                )
        return attrs


class ReverseAdjustmentSerializer(StrictSerializer):
    reason = serializers.CharField(max_length=500)


class CountAdjustmentSerializer(serializers.ModelSerializer):
    count_id = serializers.SerializerMethodField(allow_null=True)
    state = serializers.SerializerMethodField()

    class Meta:
        model = CountAdjustment
        fields = (
            "id",
            "school",
            "camera",
            "meal_service",
            "event_type",
            "count_id",
            "delta",
            "reason",
            "actor",
            "recorded_at",
            "created_at",
            "reversal_of",
            "state",
            "audit_log",
        )
        read_only_fields = fields

    def get_count_id(self, adjustment) -> str | None:
        count_id = adjustment.student_count_id or adjustment.plate_count_id
        return str(count_id) if count_id else None

    def get_state(self, adjustment) -> str:
        if adjustment.reversal_of_id:
            return "REVERSAL"
        return "REVERSED" if hasattr(adjustment, "reversal") else "APPLIED"


class CountActivitySerializer(serializers.Serializer):
    processed = serializers.IntegerField()
    duplicates = serializers.IntegerField()
    rejected = serializers.IntegerField()
    last_received_at = serializers.DateTimeField(allow_null=True)
    last_recorded_at = serializers.DateTimeField(allow_null=True)
    last_attempt_at = serializers.DateTimeField(allow_null=True)
    last_delay_seconds = serializers.FloatField(allow_null=True)
