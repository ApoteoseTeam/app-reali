from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from apps.core.models import BaseModel


class DataQuality(models.TextChoices):
    UNKNOWN = "UNKNOWN", "Histórico sem medição"
    COMPLETE = "COMPLETE", "Cobertura operacional"
    PARTIAL = "PARTIAL", "Dados parciais"
    STALE = "STALE", "Dados desatualizados"
    UNAVAILABLE = "UNAVAILABLE", "Dados indisponíveis"


DATA_QUALITY_CHOICES = DataQuality.choices


class MealService(BaseModel):
    class MealType(models.TextChoices):
        BREAKFAST = "BREAKFAST", "Café da manhã"
        LUNCH = "LUNCH", "Almoço"
        SNACK = "SNACK", "Lanche"
        DINNER = "DINNER", "Jantar"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planejado"
        PREPARING = "PREPARING", "Em preparo"
        SERVING = "SERVING", "Em distribuição"
        FINISHED = "FINISHED", "Finalizado"
        CANCELLED = "CANCELLED", "Cancelado"

    school = models.ForeignKey(
        "institutions.School", on_delete=models.PROTECT, related_name="meal_services"
    )
    date = models.DateField(db_index=True)
    meal_type = models.CharField(max_length=10, choices=MealType.choices)
    scheduled_time = models.TimeField()
    scheduled_end_time = models.TimeField(null=True, blank=True)
    entry_window_start = models.TimeField(null=True, blank=True)
    schedule = models.ForeignKey(
        "MealSchedule",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="services",
    )
    history_excluded = models.BooleanField(default=False)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PLANNED
    )
    preparation_started_at = models.DateTimeField(null=True, blank=True)
    serving_started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=500, blank=True)
    serving_data_quality = models.CharField(
        max_length=12, choices=DataQuality.choices, default=DataQuality.UNKNOWN
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    preparation_started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    serving_started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    finished_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "date", "meal_type", "scheduled_time"],
                name="uq_meal_service_slot",
            ),
            models.UniqueConstraint(
                fields=["schedule", "date"],
                condition=models.Q(schedule__isnull=False),
                name="uq_meal_schedule_day",
            ),
            models.CheckConstraint(
                condition=models.Q(scheduled_end_time__isnull=True)
                | models.Q(scheduled_end_time__gt=models.F("scheduled_time")),
                name="meal_scheduled_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(entry_window_start__isnull=True)
                | models.Q(entry_window_start__lte=models.F("scheduled_time")),
                name="meal_entry_window_before_serving",
            ),
        ]
        indexes = [
            models.Index(
                fields=["school", "meal_type", "status", "date"],
                name="meal_history_scope_idx",
            )
        ]

    def __str__(self):
        return f"{self.school.name} - {self.date} - {self.get_meal_type_display()}"


class AttendanceSnapshot(BaseModel):
    """Total de ENTRADAS considerado ao iniciar o preparo, não presença física comprovada."""

    meal_service = models.OneToOneField(
        "meals.MealService",
        on_delete=models.PROTECT,
        related_name="attendance_snapshot",
    )
    reference_time = models.DateTimeField()
    total_student_entries = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    window_start_at = models.DateTimeField(null=True, blank=True)
    window_end_at = models.DateTimeField(null=True, blank=True)
    last_source_event_at = models.DateTimeField(null=True, blank=True)
    data_quality_status = models.CharField(
        max_length=12, choices=DataQuality.choices, default=DataQuality.UNKNOWN
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("O snapshot original é imutável.")
        return super().save(*args, **kwargs)


class MealForecast(BaseModel):
    class Method(models.TextChoices):
        LEGACY_RATE = "LEGACY_RATE", "Taxa legada"
        HISTORICAL_RATE = "HISTORICAL_RATE", "Taxa histórica"
        CONFIGURED_RATE = "CONFIGURED_RATE", "Taxa inicial configurada"
        OVERRIDE_RATE = "OVERRIDE_RATE", "Taxa informada no preparo"
        UNAVAILABLE = "UNAVAILABLE", "Indisponível"

    class Confidence(models.TextChoices):
        SUFFICIENT = "SUFFICIENT", "Amostra suficiente"
        PRELIMINARY = "PRELIMINARY", "Preliminar"
        INSUFFICIENT = "INSUFFICIENT", "Insuficiente"

    meal_service = models.OneToOneField(
        "meals.MealService", on_delete=models.PROTECT, related_name="forecast"
    )
    attendance_snapshot = models.OneToOneField(
        "meals.AttendanceSnapshot", on_delete=models.PROTECT, related_name="forecast"
    )
    forecast_plates = models.PositiveIntegerField(null=True, blank=True)
    # Taxa pode ser > 1, caso ocorram segundas porções.
    estimated_plates_per_entry = models.DecimalField(
        max_digits=6, decimal_places=3, null=True, blank=True, default=Decimal("1.000")
    )
    generated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="forecasts_generated",
    )
    notes = models.TextField(blank=True)
    method = models.CharField(
        max_length=20, choices=Method.choices, default=Method.LEGACY_RATE
    )
    confidence_status = models.CharField(
        max_length=12, choices=Confidence.choices, default=Confidence.PRELIMINARY
    )
    algorithm_version = models.CharField(max_length=30, default="legacy-v1")
    parameters = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    method="UNAVAILABLE",
                    forecast_plates__isnull=True,
                    estimated_plates_per_entry__isnull=True,
                )
                | (
                    ~models.Q(method="UNAVAILABLE")
                    & models.Q(
                        forecast_plates__isnull=False,
                        estimated_plates_per_entry__isnull=False,
                        estimated_plates_per_entry__gte=0,
                    )
                ),
                name="forecast_result_requires_rate",
            ),
        ]

    def clean(self):
        super().clean()
        if self.attendance_snapshot_id and self.meal_service_id:
            if self.attendance_snapshot.meal_service_id != self.meal_service_id:
                raise ValidationError(
                    {
                        "attendance_snapshot": "A contagem base deve pertencer ao mesmo serviço de merenda."
                    }
                )
        if (
            self.estimated_plates_per_entry is not None
            and self.estimated_plates_per_entry < 0
        ):
            raise ValidationError(
                {"estimated_plates_per_entry": "A taxa não pode ser negativa."}
            )

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("A previsão original é imutável.")
        self.full_clean()
        return super().save(*args, **kwargs)


class MealSchedule(BaseModel):
    school = models.ForeignKey(
        "institutions.School", on_delete=models.PROTECT, related_name="meal_schedules"
    )
    meal_type = models.CharField(max_length=10, choices=MealService.MealType.choices)
    name = models.CharField(max_length=120)
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    entry_window_start = models.TimeField(null=True, blank=True)
    weekdays = models.JSONField()
    excluded_dates = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__isnull=True)
                | models.Q(end_time__gt=models.F("start_time")),
                name="schedule_end_after_start",
            ),
            models.CheckConstraint(
                condition=models.Q(entry_window_start__isnull=True)
                | models.Q(entry_window_start__lte=models.F("start_time")),
                name="schedule_entry_before_serving",
            ),
        ]


class MealForecastPolicy(BaseModel):
    school = models.ForeignKey(
        "institutions.School",
        on_delete=models.PROTECT,
        related_name="meal_forecast_policies",
    )
    meal_type = models.CharField(max_length=10, choices=MealService.MealType.choices)
    initial_rate = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    minimum_history = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(2), MaxValueValidator(30)]
    )
    history_days = models.PositiveSmallIntegerField(
        default=90, validators=[MinValueValidator(7), MaxValueValidator(365)]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "meal_type"], name="uq_meal_forecast_policy"
            ),
            models.CheckConstraint(
                condition=models.Q(initial_rate__isnull=True)
                | models.Q(initial_rate__range=(0, 5)),
                name="forecast_policy_initial_rate",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    minimum_history__range=(2, 30), history_days__range=(7, 365)
                ),
                name="forecast_policy_history_bounds",
            ),
        ]
