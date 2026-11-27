from dataclasses import dataclass

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.api.permissions import (
    KITCHEN_ROLES,
    MANAGEMENT_ROLES,
    ROLE_PERMISSIONS,
)
from apps.users.models import Membership

from .models import (
    Kind,
    Notification,
    NotificationDelivery,
    NotificationPreference,
    Priority,
    PushDevice,
)


@dataclass(frozen=True)
class Policy:
    roles: frozenset | set | None = None
    priority: str = Priority.NORMAL
    push: bool = False
    email: bool = False
    required: bool = False


POLICIES = {
    Kind.CAMERA_OFFLINE: Policy(MANAGEMENT_ROLES, Priority.HIGH, True, True),
    Kind.CAMERA_ERROR: Policy(MANAGEMENT_ROLES, Priority.HIGH, True, True),
    Kind.CAMERA_RECOVERED: Policy(MANAGEMENT_ROLES, Priority.LOW),
    Kind.DEVICE_SYNC_DELAY: Policy(MANAGEMENT_ROLES, Priority.HIGH, True, True),
    Kind.DEVICE_OFFLINE: Policy(MANAGEMENT_ROLES, Priority.HIGH, True, True),
    Kind.MEAL_SERVICE_REMINDER: Policy(KITCHEN_ROLES, push=True),
    Kind.MEAL_SERVICE_STARTED: Policy(KITCHEN_ROLES, Priority.LOW),
    Kind.MEAL_SERVING_STARTED: Policy(KITCHEN_ROLES, Priority.LOW),
    Kind.MEAL_SERVICE_FINISHED: Policy(KITCHEN_ROLES, Priority.LOW),
    Kind.MEAL_SERVICE_CANCELLED: Policy(KITCHEN_ROLES, Priority.HIGH, True, True),
    Kind.FORECAST_UNAVAILABLE: Policy(KITCHEN_ROLES, Priority.HIGH),
    Kind.FORECAST_DIFFERENCE: Policy(
        ROLE_PERMISSIONS["analytics_reports"], Priority.HIGH
    ),
    Kind.INVITATION_CREATED: Policy(MANAGEMENT_ROLES),
    Kind.INVITATION_EXPIRING: Policy(MANAGEMENT_ROLES, email=True),
    Kind.INVITATION_CLOSED: Policy(MANAGEMENT_ROLES),
    Kind.MEMBERSHIP_UPDATED: Policy(required=True),
    Kind.COUNT_ADJUSTMENT_CREATED: Policy(MANAGEMENT_ROLES),
    Kind.DATA_RECONCILED: Policy(ROLE_PERMISSIONS["analytics_reports"]),
    Kind.DATA_STALE: Policy(
        ROLE_PERMISSIONS["analytics_reports"], Priority.HIGH, email=True
    ),
    Kind.REPORT_READY: Policy(ROLE_PERMISSIONS["analytics_reports"]),
    Kind.SYSTEM_ANNOUNCEMENT: Policy(),
}
INVITATION_KINDS = {
    Kind.INVITATION_CREATED,
    Kind.INVITATION_EXPIRING,
    Kind.INVITATION_CLOSED,
}


def preferences(kind, stored):
    policy = POLICIES[kind]
    return {
        "in_app": policy.required or stored is None or stored.in_app,
        "push": bool(policy.push and stored and stored.push),
        "email": bool(policy.email and stored and stored.email),
    }


def eligible_members(
    organization_id, kind, *, school_id=None, recipient_id=None, institution_wide=False
):
    members = Membership.objects.filter(
        organization_id=organization_id,
        organization__is_active=True,
        is_active=True,
        user__is_active=True,
    )
    roles = POLICIES[kind].roles
    if roles is not None:
        members = members.filter(role__in=roles)
    if recipient_id is not None:
        members = members.filter(user_id=recipient_id)
    if institution_wide:
        members = members.filter(all_schools_access=True)
    if school_id is not None:
        members = members.filter(
            Q(all_schools_access=True) | Q(school_accesses__school_id=school_id),
            organization__schools__pk=school_id,
            organization__schools__is_active=True,
        )
    return members.distinct()


def kinds_for(member):
    return [
        kind
        for kind, policy in POLICIES.items()
        if policy.roles is None or member.role in policy.roles
    ]


@transaction.atomic
def publish(
    kind,
    *,
    organization_id,
    school_id=None,
    recipient_id=None,
    key,
    title,
    message,
    data=None,
    priority=None,
):
    ids = list(
        eligible_members(
            organization_id,
            kind,
            school_id=school_id,
            recipient_id=recipient_id,
            institution_wide=school_id is None and kind in INVITATION_KINDS,
        ).values_list("user_id", flat=True)
    )
    stored = {
        row.user_id: row
        for row in NotificationPreference.objects.filter(
            organization_id=organization_id,
            kind=kind,
            user_id__in=ids,
        )
    }
    channel = NotificationDelivery.Channel
    for user_id in ids:
        channels = preferences(kind, stored.get(user_id))
        if not any(channels.values()):
            continue
        notification, created = Notification.objects.get_or_create(
            recipient_id=user_id,
            organization_id=organization_id,
            event_key=key,
            defaults=dict(
                school_id=school_id,
                kind=kind,
                title=title,
                message=message,
                priority=priority or POLICIES[kind].priority,
                data=data or {},
                in_app=channels["in_app"],
            ),
        )
        if not created:
            continue
        deliveries = []
        if channels["in_app"]:
            deliveries.append(
                NotificationDelivery(
                    notification=notification,
                    channel=channel.IN_APP,
                    status=NotificationDelivery.Status.CONFIRMED,
                )
            )
        if channels["email"]:
            deliveries.append(
                NotificationDelivery(notification=notification, channel=channel.EMAIL)
            )
        if channels["push"]:
            devices = PushDevice.objects.filter(
                user_id=user_id,
                user__is_active=True,
                is_active=True,
                session_expires_at__gt=timezone.now(),
                session_version=F("user__session_version"),
            )
            deliveries.extend(
                NotificationDelivery(
                    notification=notification,
                    channel=channel.PUSH,
                    device=device,
                    binding=device.binding,
                )
                for device in devices
            )
        NotificationDelivery.objects.bulk_create(deliveries)
