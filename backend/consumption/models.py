
from django.db import models

from core.models import BaseModel


class AttendanceRecord(BaseModel):
    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTOMATIC = "AUTOMATIC", "Automático"
        IMPORTED = "IMPORTED", "Importado"

    meal = models.ForeignKey(
        "menus.Meal",
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )

    students_present = models.PositiveIntegerField()

    source = models.CharField(
        max_length=15,
        choices=Source.choices,
        default=Source.MANUAL
    )

    recorded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    recorded_at = models.DateTimeField(auto_now_add=True)

    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Presença: {self.students_present}"


class ConsumptionRecord(BaseModel):
    meal = models.ForeignKey(
        "menus.Meal",
        on_delete=models.CASCADE,
        related_name="consumption_records"
    )

    meal_item = models.ForeignKey(
        "menus.MealItem",
        on_delete=models.CASCADE,
        related_name="consumption_records"
    )

    quantity_prepared = models.DecimalField(
        max_digits=12,
        decimal_places=3
    )

    quantity_served = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )

    quantity_consumed = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0
    )

    recorded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    recorded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Consumo - {self.meal_item}"
