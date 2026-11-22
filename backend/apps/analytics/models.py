from django.db import models
from django.db.models.functions import Now
from django.utils import timezone
from apps.core.models import BaseModel


class DailyMetrics(BaseModel):
    """Consolidação por escola e data; derivada das contagens e previsões, não fonte de verdade."""

    school = models.ForeignKey(
        "institutions.School", on_delete=models.PROTECT, related_name="daily_metrics"
    )
    reference_date = models.DateField(db_index=True)
    total_student_entries = models.PositiveIntegerField(default=0)
    total_forecast_plates = models.PositiveIntegerField(default=0)
    total_served_plates = models.PositiveIntegerField(default=0)
    calculated_at = models.DateTimeField(null=True, blank=True)
    data_status = models.CharField(
        max_length=12,
        default="PROVISIONAL",
        choices=[
            ("PROVISIONAL", "Provisório"),
            ("COMPLETE", "Consolidado"),
            ("REVISED", "Revisado"),
        ],
    )
    is_complete = models.BooleanField(default=False)
    has_entries = models.BooleanField(null=True)
    has_forecast = models.BooleanField(null=True)
    has_served = models.BooleanField(null=True)
    compared_services = models.PositiveIntegerField(default=0)
    eligible_services = models.PositiveIntegerField(default=0)
    sum_absolute_error = models.PositiveBigIntegerField(default=0)
    compared_served = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "reference_date"], name="uq_daily_metrics_school_day"
            )
        ]
        verbose_name = "Indicadores diários"
        verbose_name_plural = "Indicadores diários"


class PendingDailyMetrics(models.Model):
    school = models.ForeignKey("institutions.School", on_delete=models.CASCADE)
    reference_date = models.DateField()
    queued_at = models.DateTimeField(db_index=True)
    first_queued_at = models.DateTimeField(default=timezone.now, db_default=Now(), db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["school", "reference_date"],
                name="uq_pending_metrics_school_day",
            )
        ]
