from django.db import models
from apps.core.models import BaseModel


class Camera(BaseModel):
    class CameraType(models.TextChoices):
        ENTRANCE = 'ENTRANCE', 'Portaria'
        CAFETERIA = 'CAFETERIA', 'Cantina'

    school = models.ForeignKey('institutions.School', on_delete=models.PROTECT, related_name='cameras')
    name = models.CharField(max_length=120)
    camera_type = models.CharField(max_length=12, choices=CameraType.choices)
    location = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    # Não salvar senha/RTSP com credenciais em texto puro.

    def __str__(self):
        return f'{self.name} ({self.school.name})'
