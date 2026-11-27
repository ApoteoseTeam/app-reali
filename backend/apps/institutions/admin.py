from django import forms
from django.contrib import admin

from apps.api.audit import audit
from apps.core.admin import OperationsReadOnlyAdmin
from apps.institutions.models import Organization, School


class OrganizationForm(forms.ModelForm):
    class Meta:
        model = Organization
        fields = ("name", "legal_name", "cnpj", "email", "phone")
        labels = {
            "name": "Nome da instituição",
            "legal_name": "Razão social",
            "cnpj": "CNPJ",
            "phone": "Telefone",
        }
        help_texts = {"cnpj": "Informe o CNPJ sem pontuação."}


class SchoolForm(forms.ModelForm):
    class Meta:
        model = School
        fields = ("name", "code", "address", "city", "state", "zip_code")
        labels = {
            "name": "Nome da escola",
            "code": "Código",
            "address": "Endereço",
            "city": "Cidade",
            "state": "UF",
            "zip_code": "CEP",
        }


class SchoolInline(admin.StackedInline):
    model = School
    form = SchoolForm
    verbose_name = "Escola"
    verbose_name_plural = "Escolas iniciais (opcional)"
    extra = 1
    can_delete = False


@admin.register(Organization)
class OrganizationAdmin(OperationsReadOnlyAdmin):
    reali_label = "Instituições"
    form = OrganizationForm
    inlines = (SchoolInline,)
    fields = OrganizationForm.Meta.fields
    list_display = ("name", "cnpj", "email", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "legal_name", "cnpj", "email")
    ordering = ("name",)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def get_fields(self, request, obj=None):
        if obj is None:
            return self.fields
        return (*self.fields, "is_active", "created_at", "updated_at")

    def get_readonly_fields(self, request, obj=None):
        return super().get_readonly_fields(request, obj) if obj is not None else ()

    def get_inlines(self, request, obj=None):
        return self.inlines if obj is None else ()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        audit("ORGANIZATION_CREATED", obj, actor=request.user, organization=obj)


@admin.register(School)
class SchoolAdmin(OperationsReadOnlyAdmin):
    reali_label = "Escolas"
    fields = (
        "organization",
        *SchoolForm.Meta.fields,
        "is_active",
        "created_at",
        "updated_at",
    )
    list_display = ("name", "organization", "code", "city", "state", "is_active")
    list_filter = ("is_active", "state")
    list_select_related = ("organization",)
    search_fields = ("name", "code", "organization__name", "city")
    ordering = ("name",)
