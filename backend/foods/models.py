
from django.db import models

from core.models import BaseModel


class FoodCategory(BaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Food(BaseModel):
    class Unit(models.TextChoices):
        KG = "KG", "Quilograma"
        G = "G", "Grama"
        L = "L", "Litro"
        ML = "ML", "Mililitro"
        UNIT = "UNIT", "Unidade"

    category = models.ForeignKey(
        FoodCategory,
        on_delete=models.PROTECT,
        related_name="foods"
    )

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    unit = models.CharField(
        max_length=10,
        choices=Unit.choices,
        default=Unit.KG
    )

    calories_per_100g = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Recipe(BaseModel):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    preparation_method = models.TextField(blank=True)

    servings = models.PositiveIntegerField(default=1)

    preparation_time = models.PositiveIntegerField(
        default=0,
        help_text="Tempo em minutos"
    )

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class RecipeIngredient(BaseModel):
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="ingredients"
    )

    food = models.ForeignKey(
        Food,
        on_delete=models.PROTECT,
        related_name="recipe_ingredients"
    )

    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3
    )

    unit = models.CharField(max_length=10)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "food"],
                name="unique_food_per_recipe"
            )
        ]

    def __str__(self):
        return f"{self.food.name} - {self.recipe.name}"
