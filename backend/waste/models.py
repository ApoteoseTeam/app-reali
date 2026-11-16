
from django.db import models

from core.models import BaseModel


class WasteRecord(BaseModel):
    class WasteType(models.TextChoices):
        PREPARATION = "PREPARATION", "Preparo"
        LEFTOVER = "LEFTOVER", "Sobra limpa"
        PLATE = "PLATE", "Resto de prato"
        EXPIRATION = "EXPIRATION", "Vencimento"
        OTHER = "OTHER", "Outro"

    meal = models.ForeignKey(
        "menus.Meal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waste_records"
    )

    kitchen = models.ForeignKey(
        "institutions.Kitchen",
        on_delete=models.PROTECT,
        related_name="waste_records"
    )

    waste_type = models.CharField(
        max_length=15,
        choices=WasteType.choices
    )

    description = models.TextField(blank=True)

    recorded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Desperdício - {self.kitchen.name}"


class WasteItem(BaseModel):
    waste_record = models.ForeignKey(
        WasteRecord,
        on_delete=models.CASCADE,
        related_name="items"
    )

    food = models.ForeignKey(
        "foods.Food",
        on_delete=models.PROTECT,
        related_name="waste_items"
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3
    )

    unit = models.CharField(max_length=10)

    estimated_unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    notes = models.TextField(blank=True)

    @property
    def estimated_total_cost(self):
        if self.estimated_unit_cost is None:
            return None

        return self.quantity * self.estimated_unit_cost

    def __str__(self):
        return f"{self.food.name} - {self.quantity}"
