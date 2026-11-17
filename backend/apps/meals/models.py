from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from apps.core.models import BaseModel


class MealService(BaseModel):
    class MealType(models.TextChoices):
        BREAKFAST = 'BREAKFAST', 'Café da manhã'
        LUNCH = 'LUNCH', 'Almoço'
        SNACK = 'SNACK', 'Lanche'
        DINNER = 'DINNER', 'Jantar'

    class Status(models.TextChoices):
        PLANNED = 'PLANNED', 'Planejado'
        PREPARING = 'PREPARING', 'Em preparo'
        SERVING = 'SERVING', 'Em distribuição'
        FINISHED = 'FINISHED', 'Finalizado'
        CANCELLED = 'CANCELLED', 'Cancelado'

    school = models.ForeignKey('institutions.School', on_delete=models.PROTECT, related_name='meal_services')
    date = models.DateField(db_index=True)
    meal_type = models.CharField(max_length=10, choices=MealType.choices)
    scheduled_time = models.TimeField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PLANNED)
    preparation_started_at = models.DateTimeField(null=True, blank=True)
    serving_started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['school', 'date', 'meal_type', 'scheduled_time'], name='uq_meal_service_slot')
        ]

    def __str__(self):
        return f'{self.school.name} - {self.date} - {self.get_meal_type_display()}'


class AttendanceSnapshot(BaseModel):
    """Total de ENTRADAS considerado ao iniciar o preparo, não presença física comprovada."""
    meal_service = models.OneToOneField('meals.MealService', on_delete=models.PROTECT, related_name='attendance_snapshot')
    reference_time = models.DateTimeField()
    total_student_entries = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)


class MealForecast(BaseModel):
    meal_service = models.OneToOneField('meals.MealService', on_delete=models.PROTECT, related_name='forecast')
    attendance_snapshot = models.OneToOneField('meals.AttendanceSnapshot', on_delete=models.PROTECT, related_name='forecast')
    forecast_plates = models.PositiveIntegerField()
    # Taxa pode ser > 1, caso ocorram segundas porções.
    estimated_plates_per_entry = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal('1.000'))
    generated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='forecasts_generated')
    notes = models.TextField(blank=True)

    def clean(self):
        super().clean()
        if self.attendance_snapshot_id and self.meal_service_id:
            if self.attendance_snapshot.meal_service_id != self.meal_service_id:
                raise ValidationError({'attendance_snapshot': 'A contagem base deve pertencer ao mesmo serviço de merenda.'})
        if self.estimated_plates_per_entry < 0:
            raise ValidationError({'estimated_plates_per_entry': 'A taxa não pode ser negativa.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
