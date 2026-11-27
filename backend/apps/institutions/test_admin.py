import pytest
from django.contrib.auth.models import Permission
from django.urls import reverse

from apps.api.models import AuditLog
from apps.institutions.models import Organization, School
from apps.users.models import User


@pytest.fixture
def institution_form(admin_client):
    return (
        admin_client,
        reverse("admin:institutions_organization_add"),
        {
            "name": "Rede Reali",
            "legal_name": "Rede Reali de Ensino",
            "cnpj": "12345678000195",
            "email": "contato@example.com",
            "phone": "11987654321",
            "schools-TOTAL_FORMS": "1",
            "schools-INITIAL_FORMS": "0",
            "_save": "Salvar",
        },
    )


@pytest.mark.parametrize("with_school", [True, False])
def test_superuser_creates_institution_for_account_form(institution_form, with_school):
    client, url, data = institution_form
    assert url in client.get(reverse("admin:index")).content.decode()
    assert client.get(url).status_code == 200
    if with_school:
        data.update({"schools-0-name": "Escola Reali", "schools-0-code": "01"})

    assert client.post(url, data).status_code == 302
    institution = Organization.objects.get(name="Rede Reali", is_active=True)
    assert institution.legal_name == data["legal_name"]
    assert institution.cnpj == data["cnpj"]
    school_ids = list(institution.schools.values_list("id", flat=True))
    assert len(school_ids) == int(with_school)
    assert AuditLog.objects.filter(
        action="ORGANIZATION_CREATED", organization=institution
    ).exists()

    account_form = client.get(reverse("admin:users_user_add")).context["adminform"].form
    assert (
        account_form.fields["organization"].queryset.filter(pk=institution.pk).exists()
    )
    assert school_ids == list(
        account_form.fields["schools"]
        .queryset.filter(organization=institution)
        .values_list("pk", flat=True)
    )


def test_admin_rejects_duplicate_school_codes_without_creating_institution(
    institution_form,
):
    client, url, data = institution_form
    data.update(
        {
            "schools-TOTAL_FORMS": "2",
            "schools-0-name": "Escola A",
            "schools-0-code": "01",
            "schools-1-name": "Escola B",
            "schools-1-code": "01",
        }
    )

    response = client.post(url, data)
    assert response.status_code == 200
    assert response.context["inline_admin_formsets"][0].formset.non_form_errors()
    assert not Organization.objects.exists()
    assert not School.objects.exists()


def test_staff_cannot_create_institution(institution_form):
    client, url, data = institution_form
    staff = User.objects.create_user(
        "staff@example.com", full_name="Operador", is_staff=True
    )
    staff.user_permissions.add(Permission.objects.get(codename="add_organization"))
    client.force_login(staff)

    assert client.get(url).status_code == 403
    assert client.post(url, data).status_code == 403
    assert not Organization.objects.exists()


def test_superuser_creates_school_for_existing_institution(admin_client, admin_user):
    institution = Organization.objects.create(name="Rede cadastrada")
    other = Organization.objects.create(name="Outra rede")
    School.objects.create(organization=other, name="Escola da outra rede", code="01")
    url = reverse("admin:institutions_school_add")
    assert url in admin_client.get(reverse("admin:index")).content.decode()
    assert admin_client.get(url).status_code == 200

    response = admin_client.post(
        url, {"organization": institution.pk, "name": "Nova escola", "code": "01"}
    )
    assert response.status_code == 302
    school = institution.schools.get(code="01", is_active=True)
    assert school.name == "Nova escola"
    assert AuditLog.objects.filter(
        action="SCHOOL_CREATED",
        actor=admin_user,
        organization=institution,
        school=school,
    ).exists()
    account_form = (
        admin_client.get(reverse("admin:users_user_add")).context["adminform"].form
    )
    assert account_form.fields["schools"].queryset.filter(pk=school.pk).exists()


def test_school_form_rejects_duplicate_codes_and_inactive_institutions(admin_client):
    institution = Organization.objects.create(name="Rede cadastrada")
    inactive = Organization.objects.create(name="Rede inativa", is_active=False)
    School.objects.create(organization=institution, name="Escola existente", code="01")
    url = reverse("admin:institutions_school_add")
    for organization, error_field in (
        (institution, "__all__"),
        (inactive, "organization"),
    ):
        response = admin_client.post(
            url, {"organization": organization.pk, "name": "Nova escola", "code": "01"}
        )
        assert response.status_code == 200
        assert error_field in response.context["adminform"].form.errors
    assert School.objects.count() == 1


def test_staff_cannot_create_school(admin_client):
    staff = User.objects.create_user(
        "staff@example.com", full_name="Operador", is_staff=True
    )
    staff.user_permissions.add(Permission.objects.get(codename="add_school"))
    admin_client.force_login(staff)
    url = reverse("admin:institutions_school_add")

    assert admin_client.get(url).status_code == 403
    assert admin_client.post(url, {}).status_code == 403
