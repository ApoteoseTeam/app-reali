from django import forms
from django.contrib import admin
from django.contrib.auth.forms import BaseUserCreationForm
from django.core.validators import MinLengthValidator

from apps.api.audit import audit
from apps.institutions.models import Organization, School
from apps.users.models import Membership, SchoolAccess, User, normalize_email


class SchoolChoices(forms.ModelMultipleChoiceField):
    def label_from_instance(self, school):
        return f"{school.organization} · {school.name} ({school.code})"


class AccountCreationForm(BaseUserCreationForm):
    organization = forms.ModelChoiceField(
        label="Organização",
        queryset=Organization.objects.filter(is_active=True).order_by("name"),
    )
    role = forms.ChoiceField(label="Papel", choices=Membership.Role.choices)
    all_schools_access = forms.BooleanField(
        label="Acesso a todas as escolas", required=False
    )
    schools = SchoolChoices(
        label="Escolas",
        queryset=School.objects.filter(is_active=True, organization__is_active=True)
        .select_related("organization")
        .order_by("organization__name", "name", "code"),
        required=False,
        help_text="Selecione as escolas da organização para conceder acesso restrito.",
    )

    class Meta:
        model = User
        fields = ("full_name", "email")
        labels = {"full_name": "Nome completo"}

    def clean_email(self):
        return normalize_email(self.cleaned_data["email"])

    def clean_password1(self):
        password = self.cleaned_data["password1"]
        MinLengthValidator(12)(password)
        return password

    def clean(self):
        cleaned_data = super().clean()
        organization = cleaned_data.get("organization")
        schools = cleaned_data.get("schools")
        all_schools = cleaned_data.get("all_schools_access")
        if organization is not None and schools is not None:
            if all_schools and schools:
                self.add_error(
                    "schools",
                    "Limpe a seleção para conceder acesso a todas as escolas.",
                )
            elif not all_schools and not schools:
                self.add_error("schools", "Selecione pelo menos uma escola.")
            elif any(school.organization_id != organization.pk for school in schools):
                self.add_error(
                    "schools", "Selecione somente escolas da organização escolhida."
                )
        return cleaned_data


@admin.register(User)
class AccountAdmin(admin.ModelAdmin):
    form = AccountCreationForm
    fields = (
        "full_name",
        "email",
        "password1",
        "password2",
        "organization",
        "role",
        "all_schools_access",
        "schools",
    )

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        data = form.cleaned_data
        membership = Membership.objects.create(
            user=form.instance,
            organization=data["organization"],
            role=data["role"],
            all_schools_access=data["all_schools_access"],
        )
        SchoolAccess.objects.bulk_create(
            [
                SchoolAccess(membership=membership, school=school)
                for school in data["schools"]
            ]
        )
        audit(
            "ACCOUNT_CREATED_IN_ADMIN",
            form.instance,
            actor=request.user,
            organization=membership.organization,
            details={"membership_id": str(membership.pk), "role": membership.role},
        )
