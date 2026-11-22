from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower
from apps.core.models import BaseModel


def normalize_email(email):
    return email.strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        user = self.model(email=normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if (
            extra_fields.get("is_staff") is not True
            or extra_fields.get("is_superuser") is not True
        ):
            raise ValueError("Superusuário requer is_staff=True e is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160)
    session_version = models.PositiveIntegerField(default=0, editable=False)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    objects = UserManager()

    class Meta(AbstractUser.Meta):
        constraints = [
            models.UniqueConstraint(Lower("email"), name="uq_user_email_casefold")
        ]

    def save(self, *args, **kwargs):
        self.email = normalize_email(self.email)
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class Membership(BaseModel):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrador (legado)"
        DIRECTOR = "DIRECTOR", "Diretor"
        MANAGER = "MANAGER", "Gestor"
        NUTRITIONIST = "NUTRITIONIST", "Nutricionista"
        COOK = "COOK", "Merendeira(o)"
        TEACHER = "TEACHER", "Professor(a)"
        SECRETARIAT = "SECRETARIAT", "Secretaria de Educação"

    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="memberships"
    )
    organization = models.ForeignKey(
        "institutions.Organization",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    all_schools_access = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"], name="uq_membership_user_org"
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"


class SchoolAccess(BaseModel):
    membership = models.ForeignKey(
        Membership, on_delete=models.CASCADE, related_name="school_accesses"
    )
    school = models.ForeignKey(
        "institutions.School",
        on_delete=models.PROTECT,
        related_name="membership_accesses",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["membership", "school"], name="uq_membership_school"
            )
        ]

    def clean(self):
        super().clean()
        if (
            self.membership_id
            and self.school_id
            and self.membership.organization_id != self.school.organization_id
        ):
            raise ValidationError(
                {"school": "A escola e o vínculo devem pertencer à mesma organização."}
            )

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)


MEMBERSHIP_ROLE_CHOICES = Membership.Role.choices
