import json
import logging
from collections import Counter
from io import BytesIO

from django.conf import settings
from django.db import DatabaseError, OperationalError
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiTypes,
    PolymorphicProxySerializer,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import generics, mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import (
    APIException,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.access_views import ORGANIZATION_HEADER
from apps.api.models import CameraCredential
from apps.api.permissions import membership_for, require_role, schools_for
from apps.api.serializers import (
    DeviceEventSerializer,
    PlateCountSerializer,
    StudentCountSerializer,
)
from apps.cameras.authentication import (
    DeviceAuthentication,
    DeviceTrafficThrottle,
    IsDevice,
    LegacyCameraAuthentication,
)

from . import serializers as s
from .adjustments import create_adjustment, reverse_adjustment
from .ingestion import ingest_agent, ingest_legacy
from .models import CountAdjustment, CountKind
from .queries import count_querysets, summarize_counts

logger = logging.getLogger(__name__)
LEGACY_RESULT = inline_serializer(
    "LegacyCountResult",
    fields={"id": serializers.UUIDField(), "created": serializers.BooleanField()},
)


class BodyTooLarge(APIException):
    status_code = 413
    default_detail = "Corpo acima do limite permitido."


class CountJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        data = stream.read(settings.COUNT_MAX_BODY_BYTES + 1)
        if len(data) > settings.COUNT_MAX_BODY_BYTES:
            raise BodyTooLarge()
        return super().parse(BytesIO(data), media_type, parser_context)


class CountThrottle(DeviceTrafficThrottle):
    scope = "device-counts"


def log_outcomes(request, codes, *, level=logging.WARNING):
    if codes:
        credential = getattr(request, "_auth", None)
        logger.log(
            level,
            "%s",
            json.dumps(
                {
                    "event": "COUNT_INGESTION_ERRORS",
                    "occurred_at": timezone.now().isoformat(),
                    "device_id": str(credential.edge_device_id)
                    if getattr(credential, "edge_device_id", None)
                    else None,
                    "camera_id": str(credential.camera_id)
                    if isinstance(credential, CameraCredential)
                    else None,
                    "codes": codes,
                }
            ),
        )


class DeviceCountBase(APIView):
    authentication_classes = [DeviceAuthentication]
    permission_classes = [IsDevice]
    throttle_classes = [CountThrottle]
    parser_classes = [CountJSONParser]

    def initial(self, request, *args, **kwargs):
        self.received_at = timezone.now()
        super().initial(request, *args, **kwargs)
        size = str(request.META.get("CONTENT_LENGTH") or "")
        if size.isdecimal() and int(size) > settings.COUNT_MAX_BODY_BYTES:
            raise BodyTooLarge()

    def handle_exception(self, exc):
        if isinstance(exc, DatabaseError):
            temporary = isinstance(exc, OperationalError)
            status, code = (
                (503, "INGESTION_UNAVAILABLE")
                if temporary
                else (500, "INGESTION_FAILED")
            )
            log_outcomes(self.request, {code: 1}, level=logging.ERROR)
            return Response(
                {
                    "error": {
                        "code": code,
                        "message": "Não foi possível confirmar a ingestão.",
                    }
                },
                status=status,
                headers={"Retry-After": "1"} if temporary else {},
            )
        return super().handle_exception(exc)


class DeviceCountsView(DeviceCountBase):
    authentication_classes = [DeviceAuthentication, LegacyCameraAuthentication]
    parser_classes = [CountJSONParser, FormParser, MultiPartParser]

    @extend_schema(
        request=PolymorphicProxySerializer(
            component_name="CountEventRequest",
            serializers=[s.EventSerializer, DeviceEventSerializer],
            resource_type_field_name=None,
        ),
        responses={
            code: PolymorphicProxySerializer(
                component_name="CountEventResponse",
                serializers=[s.EventResultSerializer, LEGACY_RESULT],
                resource_type_field_name=None,
            )
            for code in (200, 201)
        }
        | {409: s.CountErrorSerializer, 503: s.CountErrorSerializer},
    )
    def post(self, request):
        legacy = isinstance(request.auth, CameraCredential)
        if (
            not legacy
            and request.content_type.split(";", 1)[0].lower().strip()
            != "application/json"
        ):
            raise UnsupportedMediaType(request.content_type)
        serializer = (DeviceEventSerializer if legacy else s.EventSerializer)(
            data=request.data
        )
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            log_outcomes(request, {"INVALID_EVENT": 1})
            raise
        if legacy:
            status, result = ingest_legacy(
                request.auth, serializer.validated_data, self.received_at
            )
        else:
            [(status, result)] = ingest_agent(
                request.auth, [serializer.validated_data], self.received_at
            )
        if "error" in result:
            log_outcomes(request, {result["error"]["code"]: 1})
            if legacy:
                error = result["error"]
                field = {
                    "EVENT_CONFLICT": "event_id",
                    "EVENT_IN_FUTURE": "recorded_at",
                    "MEAL_SERVICE_REQUIRED": "meal_service",
                    "MEAL_SERVICE_STATE": "meal_service",
                    "MEAL_SERVICE_NOT_FOUND": "meal_service",
                }.get(error["code"])
                raise ValidationError(
                    {field: error["message"]} if field else error["message"]
                )
            return Response({"error": result["error"]}, status=status)
        if legacy:
            result = {"id": result["id"], "created": not result["duplicate"]}
        return Response(result, status=status)


class DeviceCountBatchView(DeviceCountBase):
    @extend_schema(
        request=s.BatchRequestSchema,
        responses={200: s.BatchResultSerializer, 503: s.CountErrorSerializer},
    )
    def post(self, request):
        envelope = s.BatchEnvelopeSerializer(data=request.data)
        envelope.is_valid(raise_exception=True)
        valid = []
        items = []
        for index, event in enumerate(envelope.validated_data["events"]):
            serializer = s.EventSerializer(data=event)
            if serializer.is_valid():
                valid.append((index, serializer.validated_data))
                items.append(None)
            else:
                event_id = event.get("event_id") if isinstance(event, dict) else None
                event_id = (
                    event_id
                    if isinstance(event_id, str) and len(event_id) <= 120
                    else None
                )
                items.append(
                    {
                        "index": index,
                        "http_status": 400,
                        "event_id": event_id,
                        "error": {
                            "code": "INVALID_EVENT",
                            "message": "Revise o evento.",
                            "fields": serializer.errors,
                        },
                    }
                )
        outcomes = ingest_agent(
            request.auth, [event for _, event in valid], self.received_at
        )
        for (index, _), (status, result) in zip(valid, outcomes, strict=True):
            items[index] = {"index": index, "http_status": status, **result}
        errors = Counter(item["error"]["code"] for item in items if "error" in item)
        log_outcomes(request, errors)
        rejected = sum(errors.values())
        return Response(
            {
                "status": "processed"
                if rejected == 0
                else "rejected"
                if rejected == len(items)
                else "partial",
                "accepted": len(items) - rejected,
                "rejected": rejected,
                "results": items,
            }
        )


class CountScopeMixin:
    kind = CountKind.STUDENT_ENTRY
    filter_class = s.CountFiltersSerializer

    def get_scope(self):
        member = require_role(membership_for(self.request), "raw_counts")
        filters = self.filter_class(data=self.request.query_params.dict())
        filters.is_valid(raise_exception=True)
        return member, filters.validated_data


class CountReadView(CountScopeMixin, generics.ListAPIView):
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.serializer_class.Meta.model.objects.none()
        member, filters = self.get_scope()
        counts, _ = count_querysets(self.kind, schools_for(member), filters)
        return counts.annotate(
            received_at=Coalesce("deviceingestionevent__received_at", "created_at")
        ).order_by("-recorded_at", "id")


@extend_schema_view(
    get=extend_schema(parameters=[ORGANIZATION_HEADER, s.CountFiltersSerializer])
)
class StudentCountView(CountReadView):
    serializer_class = StudentCountSerializer


@extend_schema_view(
    get=extend_schema(parameters=[ORGANIZATION_HEADER, s.PlateFiltersSerializer])
)
class PlateCountView(CountReadView):
    kind = CountKind.PLATE_SERVED
    filter_class = s.PlateFiltersSerializer
    serializer_class = PlateCountSerializer


class CountSummaryView(CountScopeMixin, APIView):
    def summary(self):
        member, filters = self.get_scope()
        if "date" not in filters:
            if not ({"start_at", "end_at"} & filters.keys()):
                filters["date"] = timezone.localdate()
            elif not {"start_at", "end_at"} <= filters.keys():
                raise ValidationError("Informe a data ou os dois limites do intervalo.")
        summary = summarize_counts(
            member.organization_id, self.kind, schools_for(member), filters
        )
        name = (
            "student_entries"
            if self.kind == CountKind.STUDENT_ENTRY
            else "served_plates"
        )
        return Response(
            self.summary_serializer(
                {
                    **summary,
                    name: summary["total"],
                    "school_id": filters.get("school"),
                    "reference_date": filters.get("date"),
                }
            ).data
        )


class StudentSummaryView(CountSummaryView):
    summary_serializer = s.StudentSummarySerializer

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.CountFiltersSerializer],
        responses=s.StudentSummarySerializer,
    )
    def get(self, request, *args, **kwargs):
        return self.summary()


class PlateSummaryView(CountSummaryView):
    kind = CountKind.PLATE_SERVED
    filter_class = s.PlateFiltersSerializer
    summary_serializer = s.PlateSummarySerializer

    @extend_schema(
        parameters=[ORGANIZATION_HEADER, s.PlateFiltersSerializer],
        responses=s.PlateSummarySerializer,
    )
    def get(self, request, *args, **kwargs):
        return self.summary()


def adjustment_key(request):
    raw = request.headers.get("Idempotency-Key")
    if raw is not None:
        try:
            return serializers.UUIDField().run_validation(raw)
        except ValidationError as exc:
            raise ValidationError({"Idempotency-Key": exc.detail}) from exc
    return None


@extend_schema_view(
    list=extend_schema(parameters=[ORGANIZATION_HEADER]),
    retrieve=extend_schema(parameters=[ORGANIZATION_HEADER]),
)
class CountAdjustmentViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = s.CountAdjustmentSerializer
    lookup_value_converter = "uuid"
    queryset = CountAdjustment.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        member = require_role(membership_for(self.request), "adjust_counts")
        schools = schools_for(member)
        return (
            CountAdjustment.objects.filter(
                school__in=schools, camera__school__in=schools
            )
            .select_related("reversal")
            .order_by("-created_at", "-id")
        )

    @extend_schema(
        parameters=[
            ORGANIZATION_HEADER,
            OpenApiParameter(
                "Idempotency-Key", OpenApiTypes.UUID, OpenApiParameter.HEADER
            ),
        ],
        request=s.AdjustmentInputSerializer,
        responses={201: s.CountAdjustmentSerializer},
    )
    def create(self, request):
        member = require_role(membership_for(request), "adjust_counts")
        serializer = s.AdjustmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.get_serializer(
                create_adjustment(
                    member, serializer.validated_data, adjustment_key(request)
                )
            ).data,
            status=201,
        )

    @extend_schema(
        parameters=[
            ORGANIZATION_HEADER,
            OpenApiParameter(
                "Idempotency-Key", OpenApiTypes.UUID, OpenApiParameter.HEADER
            ),
        ],
        request=s.ReverseAdjustmentSerializer,
        responses={201: s.CountAdjustmentSerializer},
    )
    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        member = require_role(membership_for(request), "adjust_counts")
        serializer = s.ReverseAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.get_serializer(
                reverse_adjustment(
                    member,
                    pk,
                    serializer.validated_data["reason"],
                    adjustment_key(request),
                )
            ).data,
            status=201,
        )
