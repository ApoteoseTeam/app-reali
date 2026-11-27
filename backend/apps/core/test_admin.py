from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.models import Permission
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from apps.api.models import InstitutionRequest, UserInvitation
from apps.cameras.models import Camera, EdgeDevice
from apps.institutions.models import Organization, School
from apps.users.models import Membership, User


def test_operations_dashboard_lists_operational_models_and_current_counts(
    admin_client, admin_user
):
    organization = Organization.objects.create(name="Rede Reali")
    Organization.objects.create(name="Rede inativa", is_active=False)
    InstitutionRequest.objects.create(
        organization_name="Rede pendente",
        contact_name="Rita",
        contact_email="rita@example.com",
    )
    for label, days in (("vigente", 1), ("vencido", -1)):
        UserInvitation.objects.create(
            organization=organization,
            email=f"{label}@example.com",
            role=Membership.Role.DIRECTOR,
            token_hash=label,
            expires_at=timezone.now() + timedelta(days=days),
            invited_by=admin_user,
        )

    response = admin_client.get(reverse("admin:index"))
    content = response.content.decode()
    assert "Equipe Reali" in content
    assert "Rede escolar" in content
    assert "Execuções do RealInova" in content
    counts = {
        card["title"]: card["value"] for card in response.context["operations_cards"]
    }
    assert counts["Instituições ativas"] == 1
    assert counts["Solicitações pendentes"] == 1
    assert counts["Convites vigentes"] == 1

    for app in admin.site.get_app_list(response.wsgi_request):
        for entry in app["models"]:
            assert admin_client.get(entry["admin_url"]).status_code == 200, entry[
                "name"
            ]


def test_staff_only_see_sections_and_cards_they_can_view(admin_client):
    staff = User.objects.create_user(
        "equipe@example.com", full_name="Equipe", is_staff=True
    )
    staff.user_permissions.add(Permission.objects.get(codename="view_organization"))
    organization = Organization.objects.create(name="Rede Reali")
    admin_client.force_login(staff)

    response = admin_client.get(reverse("admin:index"))
    assert [app["app_label"] for app in response.context["app_list"]] == [
        "institutions"
    ]
    assert [card["title"] for card in response.context["operations_cards"]] == [
        "Instituições ativas"
    ]
    detail = reverse("admin:institutions_organization_change", args=[organization.pk])
    assert admin_client.get(detail).status_code == 200
    assert admin_client.post(detail, {"name": "Outro nome"}).status_code == 403
    assert (
        admin_client.get(reverse("admin:institutions_organization_add")).status_code
        == 403
    )
    assert admin_client.get(reverse("admin:api_auditlog_changelist")).status_code == 403

    staff.is_staff = False
    staff.save(update_fields=["is_staff"])
    assert admin_client.get(reverse("admin:index")).status_code == 302


def test_account_and_session_details_do_not_render_credentials(admin_client):
    user = User.objects.create_user("pessoa@example.com", "Senha-de-teste-93!")
    token = OutstandingToken.objects.create(
        user=user,
        token="private-test-refresh-token",
        jti="jti-001",
        expires_at=timezone.now(),
    )
    revoked = BlacklistedToken.objects.create(token=token)
    for route, pk, private in (
        ("users_user", user.pk, user.password),
        ("token_blacklist_outstandingtoken", token.pk, token.token),
        ("token_blacklist_blacklistedtoken", revoked.pk, token.token),
    ):
        url = reverse(f"admin:{route}_change", args=[pk])
        response = admin_client.get(url)
        assert response.status_code == 200
        assert private.encode() not in response.content
        assert admin_client.post(url, {}).status_code == 403

    assert Client().get(reverse("admin:index")).status_code == 302


def test_camera_and_agent_details_show_current_connection(admin_client):
    organization = Organization.objects.create(name="Rede Reali")
    school = School.objects.create(
        organization=organization, name="Escola Reali", code="01"
    )
    device = EdgeDevice.objects.create(
        school=school, name="Agente Reali", last_seen_at=timezone.now()
    )
    camera = Camera.objects.create(
        school=school,
        edge_device=device,
        name="Câmera Reali",
        camera_type=Camera.CameraType.ENTRANCE,
        last_seen_at=timezone.now() - timedelta(days=1),
    )
    for route, pk, status in (
        ("cameras_edgedevice", device.pk, b"Online"),
        ("cameras_camera", camera.pk, b"Offline"),
    ):
        response = admin_client.get(reverse(f"admin:{route}_change", args=[pk]))
        assert response.status_code == 200
        assert status.lower() in response.content.lower()
