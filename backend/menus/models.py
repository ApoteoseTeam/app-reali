
from django.db import models

from core.models import BaseModel


class Menu(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        APPROVED = "APPROVED", "Aprovado"
        PUBLISHED = "PUBLISHED", "Publicado"
        CANCELLED = "CANCELLED", "Cancelado"

    school = models.ForeignKey(
        "institutions.School",
        on_delete=models.CASCADE,
        related_name="menus"
    )

    name = models.CharField(max_length=150)

    start_date = models.DateField()
    end_date = models.DateField()

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.DRAFT
    )

    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_menus"
    )

    def __str__(self):
        return self.name


class Meal(BaseModel):
    class MealType(models.TextChoices):
        BREAKFAST = "BREAKFAST", "Café da manhã"
        LUNCH = "LUNCH", "Almoço"
        SNACK = "SNACK", "Lanche"
        DINNER = "DINNER", "Jantar"

    menu = models.ForeignKey(
        Menu,
        on_delete=models.CASCADE,
        related_name="meals"
    )

    kitchen = models.ForeignKey(
        "institutions.Kitchen",
        on_delete=models.PROTECT,
        related_name="meals"
    )

    name = models.CharField(max_length=150)

    meal_type = models.CharField(
        max_length=15,
        choices=MealType.choices
    )

    scheduled_date = models.DateField()
    scheduled_time = models.TimeField(null=True, blank=True)

    planned_students = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.name} - {self.scheduled_date}"


class MealItem(BaseModel):
    meal = models.ForeignKey(
        Meal,
        on_delete=models.CASCADE,
        related_name="items"
    )

    recipe = models.ForeignKey(
        "foods.Recipe",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="meal_items"
    )

    food = models.ForeignKey(
        "foods.Food",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="meal_items"
    )

    planned_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3
    )

    unit = models.CharField(max_length=10)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(recipe__isnull=False, food__isnull=True)
                    | models.Q(recipe__isnull=True, food__isnull=False)
                ),
                name="meal_item_exactly_one_source"
            )
        ]

    def __str__(self):
        return f"Item da refeição {self.meal.name}"
