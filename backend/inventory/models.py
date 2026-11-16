
from django.db import models

from core.models import BaseModel


class StockItem(BaseModel):
    kitchen = models.ForeignKey(
        "institutions.Kitchen",
        on_delete=models.CASCADE,
        related_name="stock_items"
    )

    food = models.ForeignKey(
        "foods.Food",
        on_delete=models.PROTECT,
        related_name="stock_items"
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )

    minimum_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )

    expiration_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["kitchen", "food"],
                name="unique_food_per_kitchen"
            )
        ]

    def __str__(self):
        return f"{self.food.name} - {self.kitchen.name}"


class StockMovement(BaseModel):
    class MovementType(models.TextChoices):
        ENTRY = "ENTRY", "Entrada"
        EXIT = "EXIT", "Saída"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"
        WASTE = "WASTE", "Desperdício"

    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="movements"
    )

    movement_type = models.CharField(
        max_length=15,
        choices=MovementType.choices
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3
    )

    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    description = models.TextField(blank=True)

    performed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    movement_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.movement_type} - {self.stock_item.food.name}"
