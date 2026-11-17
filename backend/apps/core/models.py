import uuid
from django.db import models


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseCountModel(BaseModel):
    class Source(models.TextChoices):
        AUTOMATIC = 'AUTOMATIC', 'Automática'
        MANUAL = 'MANUAL', 'Manual'

    camera = models.ForeignKey('cameras.Camera', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    recorded_at = models.DateTimeField(db_index=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.AUTOMATIC)
    # ID fornecido pelo dispositivo, para garantir idempotência em reenvios.
    external_event_id = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        abstract = True
