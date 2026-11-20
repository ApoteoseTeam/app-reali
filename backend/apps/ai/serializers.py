from collections.abc import Mapping

from rest_framework import serializers

from .models import AIConversation, AIMessage, ExecutionStatus


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, Mapping) or set(data) - self.fields.keys():
            raise serializers.ValidationError(
                {"non_field_errors": ["Envie apenas os campos previstos no contrato."]}
            )
        return super().to_internal_value(data)


class SafeText(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            raise serializers.ValidationError("Informe um texto.")
        try:
            data.encode("utf-8")
        except UnicodeError:
            raise serializers.ValidationError(
                "Informe um texto Unicode válido."
            ) from None
        return super().to_internal_value(data)


class ChatInput(StrictSerializer):
    conversation_id = serializers.UUIDField(required=False)
    organization_id = serializers.UUIDField(required=False)
    school_id = serializers.UUIDField(required=False)
    client_request_id = serializers.UUIDField(required=False)
    message = SafeText(max_length=2000)


class ConversationCreate(StrictSerializer):
    school_id = serializers.UUIDField(required=False)
    title = SafeText(max_length=120, required=False)


class ConversationUpdate(StrictSerializer):
    title = SafeText(max_length=120, required=False)
    status = serializers.ChoiceField(
        choices=AIConversation.Status.choices, required=False
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Informe título ou estado.")
        return attrs


class ConversationOutput(serializers.ModelSerializer):
    school_id = serializers.UUIDField(allow_null=True)
    organization_id = serializers.UUIDField()

    class Meta:
        model = AIConversation
        fields = (
            "id",
            "organization_id",
            "school_id",
            "title",
            "status",
            "created_at",
            "updated_at",
            "last_message_at",
        )
        read_only_fields = fields


class MessageOutput(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = (
            "id",
            "role",
            "content",
            "status",
            "sources",
            "error_code",
            "created_at",
            "completed_at",
        )
        read_only_fields = fields


class ErrorOutput(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()


class SourcePeriod(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class SourceWindow(SourcePeriod):
    previous = SourcePeriod(required=False)


class SourceRow(serializers.Serializer):
    date = serializers.DateField(required=False)
    school_id = serializers.UUIDField(required=False)
    meal_service_id = serializers.UUIDField(required=False)
    meal_type = serializers.CharField(required=False, allow_null=True)
    data_status = serializers.CharField(required=False)
    calculated_at = serializers.DateTimeField(required=False, allow_null=True)
    stale = serializers.BooleanField(required=False, allow_null=True)


class SourceOutput(serializers.Serializer):
    ref = serializers.IntegerField()
    type = serializers.CharField()
    school_id = serializers.UUIDField(allow_null=True)
    period = SourceWindow()
    rows = SourceRow(many=True)
    truncated = serializers.BooleanField()


class TokenUsage(serializers.Serializer):
    input_tokens = serializers.IntegerField(allow_null=True)
    output_tokens = serializers.IntegerField(allow_null=True)
    token_usage_complete = serializers.BooleanField(allow_null=True)


class ChatOutput(serializers.Serializer):
    conversation_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=ExecutionStatus.choices)
    answer = serializers.CharField(allow_null=True)
    sources = SourceOutput(many=True)
    usage = TokenUsage()
    error = ErrorOutput(allow_null=True)
    replayed = serializers.BooleanField()


class QuotaOutput(serializers.Serializer):
    requests = serializers.IntegerField()
    request_limit = serializers.IntegerField()
    charged_microusd = serializers.IntegerField()
    budget_microusd = serializers.IntegerField()


class UsageOutput(QuotaOutput):
    reference_date = serializers.DateField()
    input_tokens = serializers.IntegerField(allow_null=True)
    output_tokens = serializers.IntegerField(allow_null=True)
    incomplete_token_runs = serializers.IntegerField()
    organization = QuotaOutput(allow_null=True)


class AIErrorEnvelope(serializers.Serializer):
    error = ErrorOutput()
