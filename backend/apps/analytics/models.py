from django.db import models
from apps.core.models import BaseModel


class DailyMetrics(BaseModel):
    """Consolidação por escola e data; derivada das contagens e previsões, não fonte de verdade."""
    school = models.ForeignKey('institutions.School', on_delete=models.PROTECT, related_name='daily_metrics')
    reference_date = models.DateField(db_index=True)
    total_student_entries = models.PositiveIntegerField(default=0)
    total_forecast_plates = models.PositiveIntegerField(default=0)
    total_served_plates = models.PositiveIntegerField(default=0)
    calculated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['school', 'reference_date'], name='uq_daily_metrics_school_day')]
        verbose_name = 'Indicadores diários'
        verbose_name_plural = 'Indicadores diários'
