from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.core.models import BaseModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O e-mail é obrigatório.')
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True or extra_fields.get('is_superuser') is not True:
            raise ValueError('Superusuário requer is_staff=True e is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

    def __str__(self):
        return self.email


class Membership(BaseModel):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        MANAGER = 'MANAGER', 'Gestor'
        NUTRITIONIST = 'NUTRITIONIST', 'Nutricionista'
        COOK = 'COOK', 'Merendeira(o)'
        TEACHER = 'TEACHER', 'Professor(a)'
        SECRETARIAT = 'SECRETARIAT', 'Secretaria de Educação'

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='memberships')
    organization = models.ForeignKey('institutions.Organization', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'organization'], name='uq_membership_user_org')]

    def __str__(self):
        return f'{self.user.email} - {self.organization.name} ({self.role})'
