from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from apps.core.models import BaseCountModel, BaseModel


class StudentCount(BaseCountModel):
    """Apenas ENTRADAS detectadas; não mede saídas nem pessoas únicas presentes."""

    camera = models.ForeignKey(
        "cameras.Camera", on_delete=models.PROTECT, related_name="student_counts"
    )

    class Meta:
        verbose_name = "Contagem de alunos"
        verbose_name_plural = "Contagens de alunos"
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="student_count_qty_positive"
            ),
            models.UniqueConstraint(
                fields=["camera", "external_event_id"],
                condition=Q(external_event_id__isnull=False),
                name="uq_student_count_event",
            ),
        ]
        indexes = [models.Index(fields=["camera", "recorded_at"])]

    def clean(self):
        super().clean()
        if self.camera_id and self.camera.camera_type != "ENTRANCE":
            raise ValidationError(
                {"camera": "Contagem de alunos exige câmera da portaria."}
            )
        if self.source == self.Source.AUTOMATIC and not self.external_event_id:
            raise ValidationError(
                {
                    "external_event_id": "Contagens automáticas exigem ID de evento para evitar duplicidade."
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class PlateCount(BaseCountModel):
    """Pratos efetivamente entregues; não identifica alunos únicos."""

    camera = models.ForeignKey(
        "cameras.Camera", on_delete=models.PROTECT, related_name="plate_counts"
    )
    meal_service = models.ForeignKey(
        "meals.MealService", on_delete=models.PROTECT, related_name="plate_counts"
    )

    class Meta:
        verbose_name = "Contagem de pratos"
        verbose_name_plural = "Contagens de pratos"
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="plate_count_qty_positive"
            ),
            models.UniqueConstraint(
                fields=["camera", "external_event_id"],
                condition=Q(external_event_id__isnull=False),
                name="uq_plate_count_event",
            ),
        ]
        indexes = [models.Index(fields=["meal_service", "recorded_at"])]

    def clean(self):
        super().clean()
        if self.camera_id:
            if self.camera.camera_type != "CAFETERIA":
                raise ValidationError(
                    {"camera": "Contagem de pratos exige câmera da cantina."}
                )
            if (
                self.meal_service_id
                and self.camera.school_id != self.meal_service.school_id
            ):
                raise ValidationError(
                    {
                        "meal_service": "A câmera e o serviço devem pertencer à mesma escola."
                    }
                )
        if self.source == self.Source.AUTOMATIC and not self.external_event_id:
            raise ValidationError(
                {
                    "external_event_id": "Contagens automáticas exigem ID de evento para evitar duplicidade."
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class CountKind(models.TextChoices):
    STUDENT_ENTRY = "STUDENT_ENTRY", "Entrada de alunos"
    PLATE_SERVED = "PLATE_SERVED", "Pratos servidos"


class DeviceIngestionEvent(BaseModel):
    camera = models.ForeignKey(
        "cameras.Camera", on_delete=models.PROTECT, related_name="count_events"
    )
    event_id = models.CharField(max_length=120)
    event_type = models.CharField(max_length=13, choices=CountKind.choices)
    payload_hash = models.CharField(max_length=64, editable=False)
    recorded_at = models.DateTimeField()
    received_at = models.DateTimeField()
    student_count = models.OneToOneField(
        StudentCount, on_delete=models.PROTECT, null=True, blank=True
    )
    plate_count = models.OneToOneField(
        PlateCount, on_delete=models.PROTECT, null=True, blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["camera", "event_id"], name="uq_ingestion_camera_event"
            ),
            models.CheckConstraint(
                condition=Q(
                    event_type=CountKind.STUDENT_ENTRY,
                    student_count__isnull=False,
                    plate_count__isnull=True,
                )
                | Q(
                    event_type=CountKind.PLATE_SERVED,
                    student_count__isnull=True,
                    plate_count__isnull=False,
                ),
                name="ingestion_typed_count",
            ),
        ]


class CameraCountActivity(BaseModel):
    camera = models.OneToOneField(
        "cameras.Camera", on_delete=models.PROTECT, related_name="count_activity"
    )
    processed = models.PositiveBigIntegerField(default=0)
    duplicates = models.PositiveBigIntegerField(default=0)
    rejected = models.PositiveBigIntegerField(default=0)
    last_received_at = models.DateTimeField(null=True, blank=True)
    last_recorded_at = models.DateTimeField(null=True, blank=True)


class CountAdjustment(BaseModel):
    school = models.ForeignKey("institutions.School", on_delete=models.PROTECT)
    camera = models.ForeignKey(
        "cameras.Camera", on_delete=models.PROTECT, related_name="count_adjustments"
    )
    event_type = models.CharField(max_length=13, choices=CountKind.choices)
    meal_service = models.ForeignKey(
        "meals.MealService", on_delete=models.PROTECT, null=True, blank=True
    )
    student_count = models.ForeignKey(
        StudentCount, on_delete=models.PROTECT, null=True, blank=True
    )
    plate_count = models.ForeignKey(
        PlateCount, on_delete=models.PROTECT, null=True, blank=True
    )
    reversal_of = models.OneToOneField(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversal"
    )
    delta = models.IntegerField()
    reason = models.CharField(max_length=500)
    recorded_at = models.DateTimeField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        indexes = [
            models.Index(
                fields=["school", "event_type", "recorded_at"],
                name="count_adjust_school_period",
            )
        ]
        constraints = [
            models.CheckConstraint(condition=~Q(delta=0), name="count_adjust_nonzero"),
            models.CheckConstraint(
                condition=Q(
                    event_type=CountKind.STUDENT_ENTRY,
                    meal_service__isnull=True,
                    plate_count__isnull=True,
                )
                | Q(
                    event_type=CountKind.PLATE_SERVED,
                    meal_service__isnull=False,
                    student_count__isnull=True,
                ),
                name="count_adjust_typed_scope",
            ),
            models.CheckConstraint(
                condition=Q(delta__gt=0)
                | Q(student_count__isnull=False)
                | Q(plate_count__isnull=False)
                | Q(reversal_of__isnull=False),
                name="count_adjust_negative_reference",
            ),
        ]
