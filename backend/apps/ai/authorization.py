from dataclasses import dataclass, replace
from hashlib import sha256
from uuid import UUID

from django.db.models import Q

from apps.api.permissions import ROLE_PERMISSIONS, schools_for
from apps.api.session_revocations import is_revoked
from apps.users.models import Membership

from .errors import AIError
from .models import AIConversation


@dataclass(frozen=True)
class Scope:
    member_id: UUID
    user_id: int
    organization_id: UUID
    session_version: int
    role: str
    school_ids: tuple[UUID, ...]
    school_id: UUID | None = None
    session_id: str | None = None

    @property
    def key(self):
        return self.key_for_role(self.role)

    def key_for_role(self, role):
        scope = f"{role}|" + ",".join(map(str, self.school_ids))
        return sha256(scope.encode()).hexdigest()

    def require(self, action):
        if self.role not in ROLE_PERMISSIONS[action]:
            raise AIError("AI_PERMISSION_DENIED")

    def bind(self, school_id):
        if school_id is None and self.role in ROLE_PERMISSIONS["realinova_limited"]:
            if len(self.school_ids) != 1:
                raise AIError("AI_INVALID_MESSAGE")
            school_id = self.school_ids[0]
        if school_id is not None:
            if school_id not in self.school_ids:
                raise AIError("AI_PERMISSION_DENIED")
            return replace(self, school_id=school_id, school_ids=(school_id,))
        return self

    def fresh(self):
        try:
            live = user_scope(
                self.user_id,
                self.organization_id,
                self.session_version,
                session_id=self.session_id,
            ).bind(self.school_id)
        except AIError:
            raise AIError("AI_PERMISSION_DENIED") from None
        if self != live:
            raise AIError("AI_PERMISSION_DENIED")
        return live

    def conversations(self, *, readable=True):
        rows = AIConversation.objects.filter(
            user_id=self.user_id, organization_id=self.organization_id
        )
        if readable:
            school_scope = Q(school_id__in=self.school_ids)
            scope = Q(access_role=self.role) & (
                school_scope | Q(school__isnull=True, scope_key=self.key)
            )
            if self.role == Membership.Role.MANAGER:
                # Historical scope keys include the role used when the conversation began.
                for previous_role in ("DIRECTOR", "ADMIN"):
                    scope |= Q(access_role=previous_role) & (
                        school_scope
                        | Q(school__isnull=True, scope_key=self.key_for_role(previous_role))
                    )
            rows = rows.filter(scope)
        return rows.order_by("-updated_at", "-pk")


def user_scope(user_id, organization_id, session_version, *, session_id=None):
    if is_revoked(session_id):
        raise AIError("AI_PERMISSION_DENIED")
    member = Membership.objects.filter(
        user_id=user_id,
        organization_id=organization_id,
        is_active=True,
        organization__is_active=True,
        user__is_active=True,
        user__session_version=session_version,
    ).first()
    if (
        not member
        or member.role
        not in ROLE_PERMISSIONS["realinova_full"]
        | ROLE_PERMISSIONS["realinova_limited"]
    ):
        raise AIError("AI_PERMISSION_DENIED")
    school_ids = tuple(
        schools_for(member, active_only=True).values_list("pk", flat=True)
    )
    return Scope(
        member.pk,
        user_id,
        organization_id,
        session_version,
        member.role,
        school_ids,
        session_id=session_id,
    )
