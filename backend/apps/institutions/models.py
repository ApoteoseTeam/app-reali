from django.db import models
from apps.core.models import BaseModel


class Organization(BaseModel):
    name = models.CharField(max_length=160)
    legal_name = models.CharField(max_length=200, blank=True)
    cnpj = models.CharField(max_length=14, unique=True, null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class School(BaseModel):
    organization = models.ForeignKey('institutions.Organization', on_delete=models.PROTECT, related_name='schools')
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=40)
    address = models.CharField(max_length=250, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zip_code = models.CharField(max_length=9, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['organization', 'code'], name='uq_school_org_code')]

    def __str__(self):
        return self.name
