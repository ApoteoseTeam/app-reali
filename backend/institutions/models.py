
from django.conf import settings
from django.db import models

from core.models import BaseModel


class Organization(BaseModel):
    name = models.CharField(max_length=150)
    legal_name = models.CharField(max_length=200, blank=True)
    cnpj = models.CharField(max_length=18, unique=True)

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class School(BaseModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="schools"
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30, blank=True)

    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zip_code = models.CharField(max_length=9, blank=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Kitchen(BaseModel):
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="kitchens"
    )

    name = models.CharField(max_length=100)
    responsible_name = models.CharField(
        max_length=150,
        blank=True
    )

    capacity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Membership(BaseModel):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Proprietário"
        ADMIN = "ADMIN", "Administrador"
        NUTRITIONIST = "NUTRITIONIST", "Nutricionista"
        MANAGER = "MANAGER", "Gestor"
        COOK = "COOK", "Cozinheiro"
        VIEWER = "VIEWER", "Visualizador"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_user_organization"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.organization}"
