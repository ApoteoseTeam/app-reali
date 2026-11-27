from django import forms
from django.contrib import admin

from apps.api.audit import audit
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
class OrganizationAdmin(admin.ModelAdmin):
    form = OrganizationForm
    inlines = (SchoolInline,)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        audit("ORGANIZATION_CREATED", obj, actor=request.user, organization=obj)
