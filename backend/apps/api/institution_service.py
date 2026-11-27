from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.institutions.models import Organization, School
from apps.users.models import Membership, normalize_email

from .audit import audit
from .invitation_service import issue_invitation
from .models import InstitutionRequest, UserInvitation
from .permissions import MANAGEMENT_ROLES


def create_institution_request(**data):
    data["contact_email"] = normalize_email(data["contact_email"])
    return InstitutionRequest.objects.create(**data)


def provision_organization(actor, *, name, email, phone, schools, manager_email):
    organization = Organization.objects.create(
        name=name, email=normalize_email(email), phone=phone
    )
    School.objects.bulk_create(
        [School(organization=organization, **school) for school in schools]
    )
    audit("ORGANIZATION_CREATED", organization, actor=actor, organization=organization)
    invitation = issue_invitation(
        organization,
        actor,
        email=manager_email,
        role=Membership.Role.MANAGER,
        all_schools_access=True,
        schools=[],
    )
    return organization, invitation


@transaction.atomic
def direct_provision(actor, **data):
    return provision_organization(actor, **data)


@transaction.atomic
def recover_manager_invitation(actor, organization_id, email):
    organization = (
        Organization.objects.select_for_update()
        .filter(pk=organization_id, is_active=True)
        .first()
    )
    if not organization:
        raise NotFound("Organização ativa não encontrada.")
    if organization.memberships.filter(
        is_active=True,
        user__is_active=True,
        role__in=MANAGEMENT_ROLES,
        all_schools_access=True,
    ).exists():
        raise ValidationError(
            "A organização já tem um gestor ativo com acesso institucional. Use o fluxo institucional."
        )
    if organization.invitations.filter(
        role__in=MANAGEMENT_ROLES,
        all_schools_access=True,
        status=UserInvitation.Status.PENDING,
        expires_at__gt=timezone.now(),
    ).exists():
        raise ValidationError("Revogue ou reenvie o convite de gestor pendente.")
    return issue_invitation(
        organization,
        actor,
        email=email,
        role=Membership.Role.MANAGER,
        all_schools_access=True,
        schools=[],
    )


@transaction.atomic
def review_institution(
    actor, request_id, *, approve, schools=None, manager_email=None, reason=""
):
    application = (
        InstitutionRequest.objects.select_for_update().filter(pk=request_id).first()
    )
    if not application:
        raise NotFound("Solicitação não encontrada.")
    outcome = (
        InstitutionRequest.Status.APPROVED
        if approve
        else InstitutionRequest.Status.REJECTED
    )
    if application.status == outcome:
        return application
    if application.status != InstitutionRequest.Status.PENDING:
        raise ValidationError("A solicitação já foi analisada.")
    details = {}
    if approve:
        organization, invite = provision_organization(
            actor,
            name=application.organization_name,
            email=application.contact_email,
            phone=application.phone,
            schools=schools,
            manager_email=manager_email or application.contact_email,
        )
        application.organization = organization
        application.initial_invitation = invite
        details = {"invitation_id": str(invite.pk)}
    else:
        application.rejection_reason = reason
    application.status = outcome
    application.reviewed_at = timezone.now()
    application.reviewed_by = actor
    application.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "organization",
            "initial_invitation",
            "rejection_reason",
            "updated_at",
        ]
    )
    audit(
        "INSTITUTION_APPROVED" if approve else "INSTITUTION_REJECTED",
        application,
        actor=actor,
        organization=application.organization,
        details=details,
    )
    return application
