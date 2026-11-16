
from django.contrib.auth.models import AbstractUser
from django.db import models

from core.models import BaseModel


class User(AbstractUser):
    email = models.EmailField(unique=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email


class UserProfile(BaseModel):
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="profile"
    )

    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(
        upload_to="profiles/",
        null=True,
        blank=True
    )

    birth_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.user.username
