from django import forms
from django.contrib import admin
from django.contrib.auth.forms import BaseUserCreationForm
from django.core.validators import MinLengthValidator

from apps.api.audit import audit
from apps.core.admin import OperationsReadOnlyAdmin
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
class AccountAdmin(OperationsReadOnlyAdmin):
    reali_label = "Contas"
    form = AccountCreationForm
    list_display = ("full_name", "email", "is_active", "is_staff", "last_login")
    list_filter = ("is_active", "is_staff")
    search_fields = ("full_name", "email")
    ordering = ("full_name", "email")
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

    def has_add_permission(self, request):
        return request.user.is_superuser

    def get_fields(self, request, obj=None):
        if obj is None:
            return self.fields
        return (
            "full_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
        )

    def get_readonly_fields(self, request, obj=None):
        return super().get_readonly_fields(request, obj) if obj is not None else ()

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


@admin.register(Membership)
class MembershipAdmin(OperationsReadOnlyAdmin):
    reali_label = "Vínculos e acessos"
    fields = (
        "user",
        "organization",
        "role",
        "is_active",
        "all_schools_access",
        "assigned_schools",
        "created_at",
        "updated_at",
    )
    list_display = ("user", "organization", "role", "is_active", "all_schools_access")
    list_filter = ("role", "is_active", "all_schools_access")
    list_select_related = ("user", "organization")
    search_fields = ("user__email", "user__full_name", "organization__name")

    @admin.display(description="Escolas atribuídas")
    def assigned_schools(self, obj):
        return (
            ", ".join(
                f"{name} ({code})"
                for name, code in obj.school_accesses.order_by(
                    "school__name", "school__code"
                ).values_list("school__name", "school__code")
            )
            or "—"
        )
