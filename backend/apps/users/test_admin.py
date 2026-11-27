import pytest
from django.test import Client
from django.urls import reverse

from apps.api.models import AuditLog
from apps.institutions.models import Organization, School
from apps.users.models import Membership, User


@pytest.fixture
def account_form(admin_client):
    organization = Organization.objects.create(name="Rede Reali")
    school = School.objects.create(
        organization=organization, name="Escola Reali", code="01"
    )
    url = reverse("admin:users_user_add")
    data = {
        "full_name": "Pessoa da Cozinha",
        "email": "Cozinha@EXAMPLE.com",
        "password1": "Cozinha-temperada-97!",
        "password2": "Cozinha-temperada-97!",
        "organization": organization.pk,
        "role": Membership.Role.COOK,
        "schools": [school.pk],
        "_save": "Salvar",
    }
    return admin_client, url, data, school


def test_superuser_can_create_an_account_with_school_access(account_form):
    client, url, data, school = account_form
    assert url in client.get(reverse("admin:index")).content.decode()
    assert client.get(url).status_code == 200

    assert client.post(url, data).status_code == 302
    user = User.objects.get(email="cozinha@example.com")
    assert user.is_active and not user.is_staff and not user.is_superuser
    membership = user.memberships.get(organization=school.organization)
    assert membership.role == Membership.Role.COOK
    assert membership.school_accesses.get().school == school
    assert AuditLog.objects.filter(
        action="ACCOUNT_CREATED_IN_ADMIN", object_id=str(user.pk)
    ).exists()

    response = Client().post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": data["password1"]},
        content_type="application/json",
    )
    assert response.status_code == 200


def test_superuser_can_grant_access_to_all_schools(account_form):
    client, url, data, _ = account_form
    data.update(schools=[], all_schools_access="on")

    assert client.post(url, data).status_code == 302
    membership = Membership.objects.get(user__email="cozinha@example.com")
    assert membership.all_schools_access
    assert not membership.school_accesses.exists()


def test_admin_rejects_school_from_another_organization(account_form):
    client, url, data, _ = account_form
    data["organization"] = Organization.objects.create(name="Outra rede").pk

    response = client.post(url, data)
    assert response.status_code == 200
    assert "schools" in response.context["adminform"].form.errors
    assert not User.objects.filter(email="cozinha@example.com").exists()


def test_admin_rejects_duplicate_email_ignoring_case(account_form):
    client, url, data, _ = account_form
    User.objects.create_user("cozinha@example.com", full_name="Pessoa já cadastrada")

    response = client.post(url, data)
    assert response.status_code == 200
    assert "email" in response.context["adminform"].form.errors
    assert not Membership.objects.filter(user__email="cozinha@example.com").exists()


def test_staff_cannot_add_accounts(account_form):
    client, url, data, _ = account_form
    staff = User.objects.create_user(
        "staff@example.com", full_name="Operador", is_staff=True
    )
    client.force_login(staff)

    assert client.get(url).status_code == 403
    assert client.post(url, data).status_code == 403
    assert not User.objects.filter(email="cozinha@example.com").exists()
