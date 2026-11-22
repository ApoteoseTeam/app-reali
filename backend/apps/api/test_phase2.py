from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

import pytest
from django.contrib.auth.models import Permission
from django.core import mail
from django.core.mail.backends.base import BaseEmailBackend
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import (
    IntegrityError,
    close_old_connections,
    connection,
    connections,
    transaction,
)
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from apps.analytics.models import DailyMetrics
from apps.institutions.models import Organization, School
from apps.meals.models import MealService
from apps.users.models import Membership, SchoolAccess, User

from .models import AuditLog, InstitutionRequest, PasswordResetMail, UserInvitation
from .session_auth import LoginSerializer

ROOT = "/api/v1/"
PASSWORD = "Correct-long-password-473!"
NEW_PASSWORD = "New-long-password-495!"
ACTIVATE = ROOT + "auth/invitations/activate/"


class OfflineEmailBackend(BaseEmailBackend):
    def send_messages(self, messages):
        raise OSError("Simulated transport failure")


@pytest.fixture(autouse=True)
def test_configuration(settings):
    cache.clear()
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.REALI_ACTIVATION_URL = "https://reali.example/ativar"
    settings.REALI_PASSWORD_RESET_URL = "https://reali.example/recuperar"


@pytest.fixture
def tenant():
    org = Organization.objects.create(name="Rede A")
    first = School.objects.create(organization=org, name="Escola A", code="A")
    second = School.objects.create(organization=org, name="Escola B", code="B")
    director = User.objects.create_user(
        "director@example.com", PASSWORD, full_name="Diretora"
    )
    member = Membership.objects.create(
        organization=org,
        user=director,
        role=Membership.Role.DIRECTOR,
        all_schools_access=True,
    )
    return org, first, second, member


def make_member(org, school, role, email):
    user = User.objects.create_user(email, PASSWORD, full_name="Funcionário")
    membership = Membership.objects.create(organization=org, user=user, role=role)
    SchoolAccess.objects.create(membership=membership, school=school)
    return membership


def client_for(user=None, org=None, access=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    headers = {}
    if org:
        headers["HTTP_X_ORGANIZATION_ID"] = str(org.pk)
    if access:
        headers["HTTP_AUTHORIZATION"] = f"Bearer {access}"
    client.credentials(**headers)
    return client


def login(email, password=PASSWORD):
    return APIClient().post(
        ROOT + "auth/login/", {"email": email, "password": password}, format="json"
    )


def mail_token(message):
    url = next(word for word in message.body.split() if word.startswith("https://"))
    assert "token" not in urlsplit(url).query
    return parse_qs(urlsplit(url).fragment)["token"][0]


def invite_payload(school, *, role="COOK", email="cook@example.com"):
    return {"email": email, "role": role, "school_ids": [str(school.pk)]}


def activation(token):
    return {
        "token": token,
        "full_name": "Beatriz",
        "password": NEW_PASSWORD,
        "password_confirmation": NEW_PASSWORD,
    }


@pytest.mark.django_db
def test_session_contract_and_internal_revocation(tenant):
    org, first, _, director = tenant
    person = make_member(org, first, Membership.Role.COOK, "person@example.com").user
    valid = login("  PERSON@EXAMPLE.COM  ")
    assert valid.status_code == 200
    tokens = valid.json()
    assert set(tokens) == {"access", "refresh", "user"}
    assert tokens["user"]["id"] == person.pk
    assert (
        login(person.email, "wrong-password").status_code
        == login("missing@example.com").status_code
        == 401
    )
    client = client_for(org=org, access=tokens["access"])
    assert client.get(ROOT + "auth/me/").json()["memberships"][0]["role"] == "COOK"
    assert [
        school["id"]
        for school in client.get(ROOT + "auth/me/schools/").json()["results"]
    ] == [str(first.pk)]

    refresh_endpoint = ROOT + "auth/refresh/"
    refreshed = APIClient().post(
        refresh_endpoint, {"refresh": tokens["refresh"]}, format="json"
    )
    assert refreshed.status_code == 200
    assert (
        APIClient()
        .post(refresh_endpoint, {"refresh": tokens["refresh"]}, format="json")
        .status_code
        == 401
    )
    new_refresh = refreshed.json()["refresh"]
    assert (
        APIClient()
        .post(ROOT + "auth/logout/", {"refresh": new_refresh}, format="json")
        .status_code
        == 200
    )
    assert (
        APIClient()
        .post(refresh_endpoint, {"refresh": new_refresh}, format="json")
        .status_code
        == 401
    )

    operator = User.objects.create_user("support@example.com", PASSWORD, is_staff=True)
    endpoint = ROOT + f"admin/users/{person.pk}/revoke-sessions/"
    assert client_for(director.user).post(endpoint).status_code == 403
    assert client_for(operator).post(endpoint).status_code == 403
    operator.user_permissions.add(
        Permission.objects.get(codename="manage_account_sessions")
    )
    operator = User.objects.get(pk=operator.pk)
    fresh = login(person.email).json()
    assert client_for(operator).post(endpoint).status_code == 204
    assert client.get(ROOT + "auth/me/").status_code == 401
    assert (
        APIClient().post(refresh_endpoint, {"refresh": fresh["refresh"]}).status_code
        == 401
    )
    assert AuditLog.objects.filter(action="SESSIONS_REVOKED", actor=operator).exists()
    person.is_active = False
    person.save(update_fields=["is_active"])
    assert login(person.email).status_code == 401


@pytest.mark.django_db
@pytest.mark.parametrize("legacy", [False, True])
def test_logout_terminates_the_rotated_session_only(tenant, legacy):
    org, _, _, director = tenant
    original = (
        RefreshToken.for_user(director.user)
        if legacy
        else LoginSerializer.get_token(director.user)
    )
    independent = LoginSerializer.get_token(director.user)
    auth = APIClient()
    rotated = auth.post(
        ROOT + "auth/refresh/", {"refresh": str(original)}, format="json"
    )
    assert rotated.status_code == 200
    tokens = rotated.json()
    client = client_for(org=org, access=tokens["access"])
    assert client.get(ROOT + "auth/me/").status_code == 200
    logout = ROOT + "auth/logout/"
    assert (
        auth.post(logout, {"refresh": str(original)}, format="json").status_code == 200
    )
    assert (
        auth.post(logout, {"refresh": str(original)}, format="json").status_code == 200
    )
    assert client.get(ROOT + "auth/me/").status_code == 401
    assert (
        client_for(org=org, access=str(independent.access_token))
        .get(ROOT + "auth/me/")
        .status_code
        == 200
    )
    assert (
        auth.post(
            ROOT + "auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
        ).status_code
        == 401
    )


@pytest.mark.django_db
@pytest.mark.parametrize("endpoint", ["refresh", "logout"])
def test_session_endpoints_require_live_refresh_credentials(tenant, endpoint):
    _, _, _, director = tenant
    valid = LoginSerializer.get_token(director.user)
    expired = LoginSerializer.get_token(director.user)
    expired.set_exp(from_time=timezone.now() - timedelta(days=8))
    api = APIClient()
    for payload in (str(expired), str(valid.access_token), "invalid"):
        assert (
            api.post(
                ROOT + f"auth/{endpoint}/", {"refresh": payload}, format="json"
            ).status_code
            == 401
        )
    assert (
        client_for(access=str(valid.access_token)).get(ROOT + "auth/me/").status_code
        == 200
    )


@pytest.mark.django_db
def test_login_throttles_repeated_authentication_attempts(monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "login", "2/min")
    assert login("missing@example.test").status_code == 401
    assert login("missing@example.test").status_code == 401
    assert login("missing@example.test").status_code == 429


@pytest.mark.django_db
def test_password_recovery_and_change(tenant):
    _, _, _, director = tenant
    user = director.user
    old_session = login(user.email).json()
    client = APIClient()
    path = ROOT + "auth/password-reset/request/"
    unknown = client.post(path, {"email": "unknown@example.com"}, format="json")
    known = client.post(path, {"email": user.email}, format="json")
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert PasswordResetMail.objects.count() == 1
    assert not getattr(mail, "outbox", [])
    call_command("process_password_reset_mail")
    assert len(mail.outbox) == 1 and not PasswordResetMail.objects.exists()
    token = mail_token(mail.outbox[0])
    confirm = ROOT + "auth/password-reset/confirm/"
    payload = {
        "token": token,
        "password": NEW_PASSWORD,
        "password_confirmation": NEW_PASSWORD,
    }
    assert (
        client.post(
            confirm, {**payload, "password_confirmation": PASSWORD}, format="json"
        ).status_code
        == 400
    )
    assert client.post(confirm, payload, format="json").status_code == 204
    assert client.post(confirm, payload, format="json").status_code == 400
    assert (
        client_for(access=old_session["access"]).get(ROOT + "auth/me/").status_code
        == 401
    )
    assert login(user.email).status_code == 401
    active = client_for(access=login(user.email, NEW_PASSWORD).json()["access"])
    change = ROOT + "auth/change-password/"
    change_data = {
        "current_password": NEW_PASSWORD,
        "password": PASSWORD,
        "password_confirmation": PASSWORD,
    }
    assert (
        active.post(
            change, {**change_data, "current_password": "wrong"}, format="json"
        ).status_code
        == 400
    )
    assert active.post(change, change_data, format="json").status_code == 204
    assert active.get(ROOT + "auth/me/").status_code == 401
    assert login(user.email).status_code == 200
    assert (
        AuditLog.objects.filter(
            action__in=["PASSWORD_CHANGED", "PASSWORD_RESET"]
        ).count()
        == 2
    )


@pytest.mark.django_db
def test_public_request_and_internal_provision_to_director_activation(
    tenant, django_capture_on_commit_callbacks
):
    org, _, _, director = tenant
    public = APIClient()
    operator = User.objects.create_user("reviewer@example.com", PASSWORD, is_staff=True)
    operator.user_permissions.add(
        Permission.objects.get(codename="review_institutions")
    )
    internal = client_for(operator)
    request_data = {
        "organization_name": "Rede Nova",
        "contact_name": "Fernanda",
        "contact_email": "bootstrap@example.com",
        "phone": "123456789012345678901",
        "status": "APPROVED",
    }
    req = public.post(ROOT + "institution-requests/", request_data, format="json")
    assert req.status_code == 201 and req.json()["status"] == "PENDING"
    assert Organization.objects.count() == 1
    assert public.post(ROOT + "auth/register/", {}).status_code == 404
    base = ROOT + f"admin/institution-requests/{req.json()['id']}/"
    payload = {"schools": [{"name": "Nova Escola", "code": "N"}]}
    assert (
        client_for(director.user, org)
        .post(base + "approve/", payload, format="json")
        .status_code
        == 403
    )
    assert internal.get(base).json()["status"] == "PENDING"
    with django_capture_on_commit_callbacks(execute=True):
        approved = internal.post(base + "approve/", payload, format="json")
        duplicate = internal.post(base + "approve/", payload, format="json")
        assert not getattr(mail, "outbox", [])
    assert approved.status_code == duplicate.status_code == 200
    assert approved.json()["organization"] == duplicate.json()["organization"]
    assert len(mail.outbox) == 1 and Organization.objects.count() == 2
    assert "Ativar minha conta" in mail.outbox[0].alternatives[0].content
    assert (
        internal.post(
            base + "reject/", {"rejection_reason": "Motivo"}, format="json"
        ).status_code
        == 400
    )
    token = mail_token(mail.outbox[0])
    assert public.post(ACTIVATE, activation(token), format="json").status_code == 200
    director_user = User.objects.get(email="bootstrap@example.com")
    created = director_user.memberships.get()
    assert created.all_schools_access and created.role == Membership.Role.DIRECTOR
    assert login(director_user.email, NEW_PASSWORD).status_code == 200
    assert (
        AuditLog.objects.filter(action="INSTITUTION_APPROVED", actor=operator).count()
        == 1
    )

    rejected = public.post(ROOT + "institution-requests/", request_data, format="json")
    rejected_url = ROOT + f"admin/institution-requests/{rejected.json()['id']}/reject/"
    assert (
        internal.post(
            rejected_url, {"rejection_reason": "Documentação incompleta"}
        ).json()["status"]
        == "REJECTED"
    )
    assert (
        InstitutionRequest.objects.filter(
            organization__isnull=True, status="REJECTED"
        ).count()
        == 1
    )
    assert internal.get(ROOT + "admin/institution-requests/").json()["count"] == 2
    with django_capture_on_commit_callbacks(execute=True):
        direct = internal.post(
            ROOT + "admin/organizations/provision/",
            {
                **payload,
                "name": "Rede Direta",
                "director_email": "direct@example.com",
            },
            format="json",
        )
    assert direct.status_code == 201
    assert (
        UserInvitation.objects.get(
            pk=direct.json()["initial_invitation"]
        ).delivery_status
        == "SENT"
    )
    invitation_path = (
        ROOT + f"admin/initial-invitations/{direct.json()['initial_invitation']}/"
    )
    recovery_path = (
        ROOT
        + f"admin/organizations/{direct.json()['organization']}/initial-invitation/"
    )
    recovery = {"email": "corrected@example.com"}
    assert internal.post(recovery_path, recovery).status_code == 400
    assert internal.post(invitation_path + "revoke/").json()["status"] == "REVOKED"
    with django_capture_on_commit_callbacks(execute=True):
        recovered = internal.post(recovery_path, recovery)
    assert recovered.status_code == 201
    assert recovered.json()["email"] == recovery["email"]


@pytest.mark.django_db
def test_invitation_verification_lifecycle_and_email_failure(
    tenant, django_capture_on_commit_callbacks, settings
):
    org, school, _, director = tenant
    client = client_for(director.user, org)
    public = APIClient()
    invite_path = ROOT + "invitations/"
    verify = ROOT + "auth/invitations/verify/"
    payload = invite_payload(school)
    with django_capture_on_commit_callbacks(execute=True):
        first = client.post(invite_path, payload, format="json")
    assert first.status_code == 201
    assert (
        client.post(
            invite_path, {**payload, "email": "COOK@EXAMPLE.COM"}, format="json"
        ).status_code
        == 400
    )
    assert len(mail.outbox) == 1
    detail = invite_path + first.json()["id"] + "/"
    first_token = mail_token(mail.outbox[0])
    assert public.post(verify, {"token": first_token}, format="json").json() == {
        "valid": True
    }
    assert public.post(verify, {"token": "invalid"}, format="json").status_code == 400
    invite = UserInvitation.objects.get(pk=first.json()["id"])
    assert first_token != invite.token_hash
    UserInvitation.objects.filter(pk=invite.pk).update(
        expires_at=timezone.now() - timedelta(seconds=1)
    )
    assert (
        public.post(ACTIVATE, activation(first_token), format="json").status_code == 400
    )
    assert client.get(detail).json()["status"] == "EXPIRED"
    settings.EMAIL_BACKEND = f"{__name__}.OfflineEmailBackend"
    with django_capture_on_commit_callbacks(execute=True):
        assert client.post(detail + "resend/").status_code == 200
    assert client.get(detail).json()["delivery_status"] == "FAILED"
    assert AuditLog.objects.filter(action="INVITATION_DELIVERY_FAILED").exists()
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    with django_capture_on_commit_callbacks(execute=True):
        assert client.post(detail + "resend/").status_code == 200
    second_token = mail_token(mail.outbox[-1])
    assert second_token != first_token
    assert public.post(verify, {"token": first_token}, format="json").status_code == 400
    assert client.post(detail + "revoke/").json()["status"] == "REVOKED"
    assert (
        public.post(ACTIVATE, activation(second_token), format="json").status_code
        == 400
    )

    with django_capture_on_commit_callbacks(execute=True):
        assert client.post(invite_path, payload, format="json").status_code == 201
    final_token = mail_token(mail.outbox[-1])
    missing_confirmation = activation(final_token)
    missing_confirmation.pop("password_confirmation")
    assert public.post(ACTIVATE, missing_confirmation, format="json").status_code == 400
    assert (
        public.post(
            ACTIVATE, {**activation(final_token), "role": "DIRECTOR"}, format="json"
        ).status_code
        == 200
    )
    assert (
        public.post(ACTIVATE, activation(final_token), format="json").status_code == 400
    )
    member = Membership.objects.get(user__email="cook@example.com")
    assert member.role == "COOK" and member.school_accesses.get().school == school
    assert login(member.user.email, NEW_PASSWORD).status_code == 200
    assert "token_hash" not in client.get(invite_path).json()[0]


@pytest.mark.django_db
def test_existing_account_invite_requires_authenticated_recipient_and_keeps_password(
    tenant, django_capture_on_commit_callbacks
):
    org, school, _, director = tenant
    another = Organization.objects.create(name="Outra Rede")
    user = User.objects.create_user("existing@example.com", PASSWORD, full_name="Antes")
    Membership.objects.create(
        organization=another, user=user, role=Membership.Role.MANAGER
    )
    client = client_for(director.user, org)
    with django_capture_on_commit_callbacks(execute=True):
        assert (
            client.post(
                ROOT + "invitations/",
                invite_payload(school, email=user.email),
                format="json",
            ).status_code
            == 201
        )
    token = mail_token(mail.outbox[-1])
    assert (
        APIClient().post(ACTIVATE, activation(token), format="json").json()["code"]
        == "login_required"
    )
    assert (
        client_for(director.user)
        .post(ACTIVATE, {"token": token}, format="json")
        .status_code
        == 401
    )
    access = login(user.email).json()["access"]
    assert (
        client_for(access=access)
        .post(ACTIVATE, {"token": token}, format="json")
        .status_code
        == 200
    )
    assert (
        user.memberships.count() == 2
        and User.objects.filter(email=user.email).count() == 1
    )
    assert (
        login(user.email).status_code == 200
        and login(user.email, NEW_PASSWORD).status_code == 401
    )


@pytest.mark.django_db
def test_management_and_school_boundaries_live_sessions(tenant):
    org, first, second, director = tenant
    other = Organization.objects.create(name="Outra")
    foreign = School.objects.create(organization=other, code="X", name="Outra")
    cook = make_member(org, first, Membership.Role.COOK, "cook@example.com")
    manager = make_member(org, first, Membership.Role.MANAGER, "manager@example.com")
    restricted = make_member(
        org, first, Membership.Role.DIRECTOR, "restricted@example.com"
    )
    director_client = client_for(director.user, org)
    restricted_client = client_for(restricted.user, org)
    user = client_for(org=org, access=login(cook.user.email).json()["access"])
    staff = ROOT + "memberships/"
    detail = staff + str(cook.pk) + "/"
    grant = detail + "schools/"
    assert (
        user.post(
            ROOT + "invitations/", invite_payload(first), format="json"
        ).status_code
        == 403
    )
    assert (
        client_for(manager.user, org)
        .patch(staff + str(director.pk) + "/", {"role": "COOK"})
        .status_code
        == 403
    )
    assert restricted_client.get(detail).status_code == 200
    assert restricted_client.get(staff + str(director.pk) + "/").status_code == 404
    assert (
        restricted_client.post(
            ROOT + "invitations/", invite_payload(first, role="DIRECTOR"), format="json"
        ).status_code
        == 403
    )
    assert (
        director_client.post(
            ROOT + "invitations/", invite_payload(foreign), format="json"
        ).status_code
        == 400
    )
    assert (
        director_client.get(
            staff + f"?school={first.pk}&role=COOK&is_active=true"
        ).json()["count"]
        == 1
    )
    assert user.get(ROOT + f"schools/{second.pk}/").status_code == 404
    assert client_for(cook.user, other).get(ROOT + "schools/").status_code == 403
    for outside_scope in (second.pk, foreign.pk, uuid4()):
        response = restricted_client.post(
            ROOT + "cameras/",
            {
                "school": str(outside_scope),
                "name": "Portaria",
                "camera_type": "ENTRANCE",
            },
            format="json",
        )
        assert response.status_code == 400
        assert response.data["school"][0].code == "does_not_exist"
    assert (
        director_client.post(staff + str(director.pk) + "/deactivate/").status_code
        == 400
    )

    assert (
        director_client.put(
            grant,
            {
                "all_schools_access": False,
                "school_ids": [str(second.pk), str(foreign.pk)],
            },
            format="json",
        ).status_code
        == 400
    )
    assert director_client.get(grant).json()["school_ids"] == [str(first.pk)]
    assert (
        director_client.put(
            grant,
            {
                "all_schools_access": False,
                "school_ids": [str(second.pk)],
            },
            format="json",
        ).status_code
        == 200
    )
    assert user.get(ROOT + f"schools/{first.pk}/").status_code == 404
    assert user.get(ROOT + f"schools/{second.pk}/").status_code == 200
    assert restricted_client.get(detail).status_code == 404
    assert director_client.post(detail + "deactivate/").status_code == 200
    assert user.get(ROOT + "schools/").status_code == 403
    assert user.get(ROOT + "auth/me/").json()["memberships"] == []
    assert director_client.post(detail + "reactivate/").status_code == 200
    assert (
        director_client.patch(detail, {"role": "TEACHER"}, format="json").status_code
        == 200
    )
    assert user.get(ROOT + "meal-services/").status_code == 403
    assert (
        AuditLog.objects.filter(
            action="SCHOOL_ACCESS_CHANGED", actor=director.user
        ).count()
        == 1
    )
    assert (
        AuditLog.objects.filter(
            action="MEMBERSHIP_ROLE_CHANGED", actor=director.user
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_role_matrix_for_existing_data_and_inactive_school(tenant):
    org, first, second, _ = tenant
    today = timezone.localdate()
    for school in (first, second):
        DailyMetrics.objects.create(
            school=school,
            reference_date=today,
            total_student_entries=50,
            total_forecast_plates=30,
            total_served_plates=25,
        )
    DailyMetrics.objects.create(school=first, reference_date=today - timedelta(days=45))
    meal = MealService.objects.create(
        school=first, date=today, scheduled_time="12:00", meal_type="LUNCH"
    )
    for role in ("MANAGER", "NUTRITIONIST", "COOK", "TEACHER", "SECRETARIAT"):
        actor = make_member(org, first, role, f"{role.lower()}@example.com")
        client = client_for(actor.user, org)
        indicators = client.get(ROOT + "analytics/daily/").json()
        assert indicators["count"] == (1 if role in {"TEACHER", "COOK"} else 2)
        assert indicators["results"][0]["total_served_plates"] == (
            None if role == "TEACHER" else 25
        )
        assert client.get(ROOT + "student-counts/").status_code == (
            403 if role in {"TEACHER", "COOK"} else 200
        )
        forecast_status = {"TEACHER": 403, "SECRETARIAT": 200}.get(role, 404)
        assert (
            client.get(ROOT + f"meal-services/{meal.pk}/forecast/").status_code
            == forecast_status
        )
        if role in {"TEACHER", "NUTRITIONIST", "SECRETARIAT"}:
            assert (
                client.post(ROOT + f"meal-services/{meal.pk}/start/").status_code == 403
            )
        if role == "COOK":
            first.is_active = False
            first.save(update_fields=["is_active"])
            assert client.get(ROOT + "auth/me/schools/").json()["count"] == 0
            assert (
                client.post(ROOT + f"meal-services/{meal.pk}/start/").status_code == 403
            )
            first.is_active = True
            first.save(update_fields=["is_active"])
            assert (
                client.post(ROOT + f"meal-services/{meal.pk}/start/").status_code == 200
            )


@pytest.mark.django_db
def test_case_insensitive_email_and_school_access_constraints(tenant):
    org, _, _, _ = tenant
    other = Organization.objects.create(name="Outra")
    school = School.objects.create(organization=other, name="Outra", code="X")
    user = User.objects.create_user(" Mixed@Example.com ", PASSWORD)
    member = Membership.objects.create(organization=org, user=user, role="COOK")
    assert user.email == "mixed@example.com"
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.bulk_create([User(email="MIXED@EXAMPLE.COM")])
    with pytest.raises(ValidationError):
        SchoolAccess.objects.create(school=school, membership=member)


@pytest.mark.django_db(transaction=True)
def test_parallel_invitation_acceptance(tenant):
    if connection.vendor != "postgresql":
        pytest.skip("A verificação de locks requer PostgreSQL.")
    org, first, _, director = tenant
    token, digest = UserInvitation.generate_token()
    invitation = UserInvitation.objects.create(
        organization=org,
        email="parallel@example.com",
        role="COOK",
        invited_by=director.user,
        token_hash=digest,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    invitation.schools.add(first)
    barrier = Barrier(2)

    def activate():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            return (
                APIClient().post(ACTIVATE, activation(token), format="json").status_code
            )
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(lambda _: activate(), range(2)))
    assert sorted(statuses) == [200, 400]
    assert (
        Membership.objects.filter(
            user__email=invitation.email, organization=org
        ).count()
        == 1
    )
    assert (
        AuditLog.objects.filter(
            action="INVITATION_ACCEPTED", object_id=invitation.pk
        ).count()
        == 1
    )


def test_account_fallback_pages_do_not_echo_tokens():
    client = APIClient()
    for path in ("/ativar/", "/recuperar/"):
        page = client.get(path + "?token=fixture-marker")
        assert page.status_code == 200
        assert page["Referrer-Policy"] == "no-referrer"
        assert "no-store" in page["Cache-Control"]
        assert "frame-ancestors 'none'" in page["Content-Security-Policy"]
        assert b"fixture-marker" not in page.content
        assert b"reali/account.js" in page.content
        assert client.post(path, {}).status_code == 405


@pytest.mark.django_db(transaction=True)
def test_parallel_approval_is_idempotent():
    if connection.vendor != "postgresql":
        pytest.skip("A verificação de locks requer PostgreSQL.")
    operator = User.objects.create_superuser("operator@example.com", PASSWORD)
    application = InstitutionRequest.objects.create(
        organization_name="Rede concorrente",
        contact_name="Contato",
        contact_email="contact@example.com",
    )
    barrier = Barrier(2)
    path = ROOT + f"admin/institution-requests/{application.pk}/approve/"
    payload = {"schools": [{"name": "Escola", "code": "A"}]}

    def approve():
        close_old_connections()
        try:
            barrier.wait(timeout=10)
            response = client_for(User.objects.get(pk=operator.pk)).post(
                path, payload, format="json"
            )
            return response.status_code, response.json()["organization"]
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(lambda _: approve(), range(2)))
    assert outcomes[0] == outcomes[1] and outcomes[0][0] == 200
    assert Organization.objects.count() == UserInvitation.objects.count() == 1
    assert AuditLog.objects.filter(action="INSTITUTION_APPROVED").count() == 1
