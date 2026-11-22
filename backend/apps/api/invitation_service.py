import hashlib
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, ValidationError

from apps.institutions.models import Organization
from apps.notifications.events import invitation_event
from apps.notifications.models import Kind
from apps.users.models import Membership, SchoolAccess, User, normalize_email

from .account_mail import account_link, send_account_mail
from .account_service import check_password_policy
from .audit import audit
from .membership_service import locked_staff, validate_grant
from .models import UserInvitation
from .permissions import DIRECTORS, schools_for


class ExistingAccountLoginRequired(APIException):
    status_code = 401
    default_detail = {
        "code": "login_required",
        "detail": "Entre com a conta convidada para aceitar este vínculo.",
    }
    default_code = "login_required"


def invalid_invitation():
    return ValidationError({"token": "Convite inválido, expirado ou utilizado."})


def manageable_invitations(actor):
    invitations = UserInvitation.objects.filter(organization_id=actor.organization_id)
    if not actor.all_schools_access:
        links = UserInvitation.schools.through.objects.filter(
            userinvitation_id=OuterRef("pk")
        )
        invitations = invitations.filter(
            Exists(links),
            ~Exists(links.exclude(school_id__in=schools_for(actor).values("pk"))),
            all_schools_access=False,
        ).exclude(role__in=DIRECTORS)
    return invitations.order_by("-created_at", "id")


def deliver_invitation(invitation_id, digest, link, actor):
    invite = (
        UserInvitation.objects.select_related("organization")
        .filter(
            pk=invitation_id,
            token_hash=digest,
            status=UserInvitation.Status.PENDING,
            expires_at__gt=timezone.now(),
            organization__is_active=True,
        )
        .first()
    )
    if not invite:
        return
    succeeded = send_account_mail(
        "invitation",
        "Convite para o Reali",
        invite.email,
        {
            "organization": invite.organization.name,
            "role": invite.get_role_display(),
            "link": link,
        },
        reference=invitation_id,
    )
    with transaction.atomic():
        updated = UserInvitation.objects.filter(
            pk=invitation_id, token_hash=digest
        ).update(
            delivery_status="SENT" if succeeded else "FAILED",
            last_sent_at=timezone.now() if succeeded else None,
        )
        if updated:
            audit(
                "INVITATION_SENT" if succeeded else "INVITATION_DELIVERY_FAILED",
                invite,
                actor=actor,
                organization=invite.organization,
            )


def rotate_token(invite, event, actor):
    raw, digest = UserInvitation.generate_token()
    link = account_link(settings.REALI_ACTIVATION_URL, raw)
    invite.token_hash = digest
    invite.expires_at = timezone.now() + timedelta(hours=48)
    invite.status = UserInvitation.Status.PENDING
    invite.delivery_status = "PENDING"
    invite.last_sent_at = None
    invite.save()
    audit(event, invite, actor=actor, organization=invite.organization)
    transaction.on_commit(lambda: deliver_invitation(invite.pk, digest, link, actor))


def expire_invitation(invite):
    # The caller holds the organization lock.
    invite.status = UserInvitation.Status.EXPIRED
    invite.save(update_fields=["status", "updated_at"])
    audit("INVITATION_EXPIRED", invite, organization=invite.organization)
    invitation_event(invite, Kind.INVITATION_CLOSED, "expired")


def ensure_invitable(organization, email, *, exclude=None):
    if Membership.objects.filter(organization=organization, user__email=email).exists():
        raise ValidationError(
            {
                "email": "Já existe vínculo institucional. Use o gerenciamento de funcionários."
            }
        )
    pending = UserInvitation.objects.filter(
        organization=organization,
        email=email,
        status=UserInvitation.Status.PENDING,
    ).exclude(pk=exclude)
    for invite in pending.filter(expires_at__lte=timezone.now()):
        expire_invitation(invite)
    if pending.exists():
        raise ValidationError(
            {"email": "Já existe convite pendente. Use o reenvio ou revogue o convite."}
        )


def issue_invitation(organization, actor, *, email, role, all_schools_access, schools):
    # Caller owns the organization lock, or has just created the organization in this transaction.
    email = normalize_email(email)
    ensure_invitable(organization, email)
    invite = UserInvitation(
        organization=organization,
        invited_by=actor,
        email=email,
        role=role,
        all_schools_access=all_schools_access,
    )
    rotate_token(invite, "INVITATION_CREATED", actor)
    invite.schools.set(schools)
    invitation_event(invite, Kind.INVITATION_CREATED, "created")
    return invite


@transaction.atomic
def invite_employee(actor, *, email, role, all_schools_access, school_ids):
    actor = locked_staff(actor)
    schools = validate_grant(actor, role, all_schools_access, school_ids)
    return issue_invitation(
        actor.organization,
        actor.user,
        email=email,
        role=role,
        all_schools_access=all_schools_access,
        schools=schools,
    )


@transaction.atomic
def update_invitation(invite_id, operation, *, actor=None, internal_user=None):
    if actor is not None:
        actor = locked_staff(actor)
        invites = manageable_invitations(actor)
        user = actor.user
    else:
        org_id = (
            UserInvitation.objects.filter(pk=invite_id)
            .values_list("organization_id", flat=True)
            .first()
        )
        organization = (
            Organization.objects.select_for_update().filter(pk=org_id).first()
        )
        if not organization:
            raise NotFound("Convite não encontrado.")
        invites = UserInvitation.objects.filter(
            organization=organization,
            invited_by__is_staff=True,
            role__in=DIRECTORS,
            all_schools_access=True,
        )
        user = internal_user
    invite = invites.filter(pk=invite_id).first()
    if not invite:
        raise NotFound("Convite não encontrado.")
    if operation == "revoke" and invite.status in {
        UserInvitation.Status.PENDING,
        UserInvitation.Status.EXPIRED,
    }:
        invite.status = UserInvitation.Status.REVOKED
        invite.revoked_at = timezone.now()
        invite.save(update_fields=["status", "revoked_at", "updated_at"])
        audit(
            "INVITATION_REVOKED", invite, actor=user, organization=invite.organization
        )
        invitation_event(invite, Kind.INVITATION_CLOSED, "revoked")
    elif operation == "resend" and invite.status in {
        UserInvitation.Status.PENDING,
        UserInvitation.Status.EXPIRED,
    }:
        if not invite.organization.is_active:
            raise ValidationError("Organização inativa.")
        invitation_schools(invite)
        ensure_invitable(invite.organization, invite.email, exclude=invite.pk)
        rotate_token(invite, "INVITATION_RESENT", user)
        invitation_event(invite, Kind.INVITATION_CREATED, "resent")
    else:
        raise ValidationError("O estado atual do convite impede esta operação.")
    return invite


def valid_invitation(token):
    digest = hashlib.sha256(token.encode()).hexdigest()
    invite = UserInvitation.objects.filter(
        token_hash=digest, organization__is_active=True
    ).first()
    if not invite or not invite.valid:
        raise invalid_invitation()
    return invite


def invitation_schools(invite):
    schools = list(invite.schools.all())
    if invite.all_schools_access:
        if schools:
            raise ValidationError("O escopo do convite requer revisão.")
    elif not schools or any(
        school.organization_id != invite.organization_id or not school.is_active
        for school in schools
    ):
        raise ValidationError("O escopo do convite requer revisão.")
    return schools


@transaction.atomic
def accept_invitation(request_user, *, token, full_name=None, password=None):
    invite = valid_invitation(token)
    Organization.objects.select_for_update().get(pk=invite.organization_id)
    invite = valid_invitation(token)
    schools = invitation_schools(invite)
    user = User.objects.select_for_update().filter(email=invite.email).first()
    created = user is None
    if created:
        if request_user.is_authenticated:
            raise ValidationError("Encerre a sessão antes de ativar a nova conta.")
        if not full_name or not password:
            raise ValidationError(
                {"password": "Informe o nome e defina uma senha para a nova conta."}
            )
        user = User(email=invite.email, full_name=full_name)
        check_password_policy(user, password)
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    invite.email, password, full_name=full_name
                )
        except IntegrityError:
            if not User.objects.filter(email=invite.email).exists():
                raise
            raise ExistingAccountLoginRequired()
        audit("ACCOUNT_ACTIVATED", user, actor=user, organization=invite.organization)
        if invite.role in DIRECTORS:
            audit(
                "INSTITUTIONAL_ADMIN_CREATED",
                user,
                actor=invite.invited_by,
                organization=invite.organization,
            )
    elif not user.is_active or request_user.pk != user.pk:
        raise ExistingAccountLoginRequired()

    if Membership.objects.filter(user=user, organization=invite.organization).exists():
        raise ValidationError("Já existe um vínculo nesta organização.")
    membership = Membership.objects.create(
        user=user,
        organization=invite.organization,
        role=invite.role,
        all_schools_access=invite.all_schools_access,
    )
    SchoolAccess.objects.bulk_create(
        [SchoolAccess(membership=membership, school=school) for school in schools]
    )
    invite.status = UserInvitation.Status.ACCEPTED
    invite.accepted_at = timezone.now()
    invite.save(update_fields=["status", "accepted_at", "updated_at"])
    audit(
        "INVITATION_ACCEPTED",
        invite,
        actor=user,
        organization=invite.organization,
        details={"membership_id": str(membership.pk)},
    )
    invitation_event(invite, Kind.INVITATION_CLOSED, "accepted")
    if created:
        transaction.on_commit(
            lambda: send_account_mail(
                "activation_confirmed",
                "Sua conta Reali está ativa",
                user.email,
                {"organization": invite.organization.name},
                reference=invite.pk,
            )
        )
    return membership
