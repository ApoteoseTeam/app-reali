from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from apps.core.models import BaseCountModel


class StudentCount(BaseCountModel):
    """Apenas ENTRADAS detectadas; não mede saídas nem pessoas únicas presentes."""
    camera = models.ForeignKey('cameras.Camera', on_delete=models.PROTECT, related_name='student_counts')

    class Meta:
        verbose_name = 'Contagem de alunos'
        verbose_name_plural = 'Contagens de alunos'
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name='student_count_qty_positive'),
            models.UniqueConstraint(fields=['camera', 'external_event_id'], condition=Q(external_event_id__isnull=False), name='uq_student_count_event'),
        ]
        indexes = [models.Index(fields=['camera', 'recorded_at'])]

    def clean(self):
        super().clean()
        if self.camera_id and self.camera.camera_type != 'ENTRANCE':
            raise ValidationError({'camera': 'Contagem de alunos exige câmera da portaria.'})
        if self.source == self.Source.AUTOMATIC and not self.external_event_id:
            raise ValidationError({'external_event_id': 'Contagens automáticas exigem ID de evento para evitar duplicidade.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class PlateCount(BaseCountModel):
    """Pratos efetivamente entregues; não identifica alunos únicos."""
    camera = models.ForeignKey('cameras.Camera', on_delete=models.PROTECT, related_name='plate_counts')
    meal_service = models.ForeignKey('meals.MealService', on_delete=models.PROTECT, related_name='plate_counts')

    class Meta:
        verbose_name = 'Contagem de pratos'
        verbose_name_plural = 'Contagens de pratos'
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name='plate_count_qty_positive'),
            models.UniqueConstraint(fields=['camera', 'external_event_id'], condition=Q(external_event_id__isnull=False), name='uq_plate_count_event'),
        ]
        indexes = [models.Index(fields=['meal_service', 'recorded_at'])]

    def clean(self):
        super().clean()
        if self.camera_id:
            if self.camera.camera_type != 'CAFETERIA':
                raise ValidationError({'camera': 'Contagem de pratos exige câmera da cantina.'})
            if self.meal_service_id and self.camera.school_id != self.meal_service.school_id:
                raise ValidationError({'meal_service': 'A câmera e o serviço devem pertencer à mesma escola.'})
        if self.source == self.Source.AUTOMATIC and not self.external_event_id:
            raise ValidationError({'external_event_id': 'Contagens automáticas exigem ID de evento para evitar duplicidade.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
