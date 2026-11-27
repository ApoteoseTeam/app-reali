from django.db import transaction
from django.db.models import Exists, OuterRef
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.institutions.models import Organization
from apps.notifications.events import membership_event
from apps.users.models import Membership, SchoolAccess

from .account_mail import send_account_mail
from .audit import audit
from .permissions import MANAGEMENT_ROLES, require_role, schools_for


def locked_staff(actor):
    organization = (
        Organization.objects.select_for_update()
        .filter(pk=actor.organization_id, is_active=True)
        .first()
    )
    if not organization:
        raise PermissionDenied("Organização inativa.")
    actor = Membership.objects.filter(
        pk=actor.pk, is_active=True, user__is_active=True
    ).first()
    if not actor:
        raise PermissionDenied("Vínculo indisponível.")
    return require_role(actor, "staff")


def validate_grant(actor, role, all_schools, school_ids):
    if (role in MANAGEMENT_ROLES or all_schools) and not actor.all_schools_access:
        raise PermissionDenied("A atribuição exige um gestor com acesso institucional.")
    if all_schools and school_ids:
        raise ValidationError(
            {"school_ids": "Envie escolas específicas apenas para escopo restrito."}
        )
    if not all_schools and not school_ids:
        raise ValidationError({"school_ids": "Informe pelo menos uma escola."})
    schools = list(schools_for(actor, active_only=True).filter(pk__in=school_ids))
    if len(schools) != len(set(school_ids)):
        raise ValidationError(
            {"school_ids": "Uma ou mais escolas estão fora do escopo ou inativas."}
        )
    return schools


def manageable_memberships(actor):
    memberships = Membership.objects.filter(
        organization_id=actor.organization_id
    ).select_related("user")
    if not actor.all_schools_access:
        access = SchoolAccess.objects.filter(membership_id=OuterRef("pk"))
        authorized = schools_for(actor).values("pk")
        memberships = memberships.filter(
            Exists(access),
            ~Exists(access.exclude(school_id__in=authorized)),
            all_schools_access=False,
        ).exclude(role__in=MANAGEMENT_ROLES)
    return memberships.order_by("id")


def prevent_last_manager(
    membership, *, resulting_role, resulting_active, resulting_all_schools
):
    if (
        membership.role not in MANAGEMENT_ROLES
        or not membership.is_active
        or not membership.user.is_active
    ):
        return
    other = Membership.objects.filter(
        organization_id=membership.organization_id,
        is_active=True,
        user__is_active=True,
        role__in=MANAGEMENT_ROLES,
    ).exclude(pk=membership.pk)
    if (resulting_role not in MANAGEMENT_ROLES or not resulting_active) and not other.exists():
        raise ValidationError("A organização deve manter um gestor ativo.")
    if (
        membership.all_schools_access
        and (
            resulting_role not in MANAGEMENT_ROLES
            or not resulting_active
            or not resulting_all_schools
        )
        and not other.filter(all_schools_access=True).exists()
    ):
        raise ValidationError(
            "A organização deve manter um gestor ativo com acesso institucional."
        )


@transaction.atomic
def update_membership(actor, membership_id, *, role=None, is_active=None, grant=None):
    actor = locked_staff(actor)
    membership = manageable_memberships(actor).filter(pk=membership_id).first()
    if not membership:
        raise NotFound("Vínculo não encontrado.")
    resulting_role = role if role is not None else membership.role
    resulting_active = membership.is_active if is_active is None else is_active
    if resulting_active and resulting_role not in Membership.Role.values:
        raise ValidationError(
            {"role": "Escolha um cargo vigente para reativar o vínculo."}
        )
    all_schools = (
        membership.all_schools_access if grant is None else grant["all_schools_access"]
    )
    if resulting_role in MANAGEMENT_ROLES and not actor.all_schools_access:
        raise PermissionDenied("A atribuição exige um gestor com acesso institucional.")
    if is_active is True and not membership.user.is_active:
        raise ValidationError("A conta do funcionário está inativa.")
    if (
        is_active is True
        and not membership.all_schools_access
        and not schools_for(membership, active_only=True).exists()
    ):
        raise ValidationError("Atribua uma escola ativa antes de reativar o vínculo.")
    prevent_last_manager(
        membership,
        resulting_role=resulting_role,
        resulting_active=resulting_active,
        resulting_all_schools=all_schools,
    )

    changes = []
    if grant is not None:
        schools = validate_grant(
            actor, resulting_role, all_schools, grant["school_ids"]
        )
        membership.school_accesses.exclude(school__in=schools).delete()
        SchoolAccess.objects.bulk_create(
            [SchoolAccess(membership=membership, school=school) for school in schools],
            ignore_conflicts=True,
        )
        membership.all_schools_access = all_schools
        changes.append("all_schools_access")
        audit(
            "SCHOOL_ACCESS_CHANGED",
            membership,
            actor=actor.user,
            organization=actor.organization,
            details={
                "all_schools_access": all_schools,
                "school_ids": [str(school.pk) for school in schools],
            },
        )
    if membership.role != resulting_role:
        audit(
            "MEMBERSHIP_ROLE_CHANGED",
            membership,
            actor=actor.user,
            organization=actor.organization,
            details={"previous_role": membership.role, "role": resulting_role},
        )
        membership.role = resulting_role
        changes.append("role")
    if membership.is_active != resulting_active:
        membership.is_active = resulting_active
        changes.append("is_active")
        audit(
            "MEMBERSHIP_REACTIVATED" if resulting_active else "MEMBERSHIP_DEACTIVATED",
            membership,
            actor=actor.user,
            organization=actor.organization,
        )
        if not resulting_active:
            transaction.on_commit(
                lambda: send_account_mail(
                    "access_revoked",
                    "Acesso institucional ao Reali",
                    membership.user.email,
                    {"organization": actor.organization.name},
                    reference=membership.pk,
                )
            )
    if changes:
        membership.save(update_fields=[*changes, "updated_at"])
        membership_event(membership)
    return membership
