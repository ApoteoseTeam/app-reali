import logging
import uuid
from datetime import datetime, timedelta
from smtplib import SMTPException

import httpx
from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.meals.models import MealService

from .devices import PushNotConfigured, cipher
from .models import Kind, NotificationDelivery, NotificationPreference, PushDevice
from .services import INVITATION_KINDS, eligible_members, preferences

log = logging.getLogger(__name__)
Channel = NotificationDelivery.Channel
Status = NotificationDelivery.Status
RECEIPT_WAIT = timedelta(minutes=15)
DELIVERY_AGE = timedelta(hours=24)
MAX_ATTEMPTS = 6
RETRYABLE = {"MessageRateExceeded", "ExpoServerError"}
REJECTIONS = {
    "DeviceNotRegistered",
    "MessageTooBig",
    "MismatchSenderId",
    "InvalidCredentials",
    "InvalidProviderToken",
}


class DeliveryError(Exception):
    def __init__(self, code, *, retry=False, rejected=False):
        self.code = code
        self.retry = retry
        self.rejected = rejected


def expo_request(endpoint, body):
    headers = {"Accept": "application/json"}
    if settings.NOTIFICATION_EXPO_ACCESS_TOKEN:
        headers["Authorization"] = "Bearer " + settings.NOTIFICATION_EXPO_ACCESS_TOKEN
    try:
        response = httpx.post(
            "https://exp.host/--/api/v2/push/" + endpoint,
            json=body,
            headers=headers,
            timeout=8,
            proxy=settings.NOTIFICATION_PUSH_PROXY,
            trust_env=False,
        )
    except httpx.RequestError as exc:
        raise DeliveryError("expo_network", retry=True) from exc
    if response.status_code == 429 or response.status_code >= 500:
        raise DeliveryError("expo_unavailable", retry=True)
    if not response.is_success:
        raise DeliveryError("expo_http_rejected", rejected=True)
    try:
        result = response.json()["data"]
    except (ValueError, KeyError, TypeError) as exc:
        raise DeliveryError("expo_invalid_response", retry=True) from exc
    if not isinstance(result, dict):
        raise DeliveryError("expo_invalid_response", retry=True)
    return result


def validate_expo_result(result):
    if isinstance(result, dict) and result.get("status") == "ok":
        return
    if not isinstance(result, dict) or result.get("status") != "error":
        raise DeliveryError("expo_invalid_response", retry=True)
    details = result.get("details")
    code = details.get("error") if isinstance(details, dict) else None
    if isinstance(code, str) and code in RETRYABLE:
        raise DeliveryError(code, retry=True)
    raise DeliveryError(
        code if isinstance(code, str) and code in REJECTIONS else "expo_rejected",
        rejected=True,
    )


@transaction.atomic
def claim():
    now = timezone.now()
    delivery = (
        NotificationDelivery.objects.select_for_update(skip_locked=True)
        .filter(
            channel__in=[Channel.PUSH, Channel.EMAIL],
            next_attempt_at__lte=now,
        )
        .filter(
            Q(status__in=[Status.PENDING, Status.SENT])
            | Q(status=Status.ACCEPTED, channel=Channel.PUSH)
        )
        .filter(
            Q(lease_until__isnull=True) | Q(lease_until__lte=now),
        )
        .order_by(
            "next_attempt_at",
            "pk",
        )
        .first()
    )
    if delivery is None:
        return None
    if delivery.status == Status.ACCEPTED:
        delivery.receipt_attempt_count += 1
    else:
        delivery.status = Status.SENT
        delivery.attempt_count += 1
    delivery.lease_id = uuid.uuid4()
    delivery.lease_until = now + timedelta(minutes=2)
    delivery.save(
        update_fields=[
            "status",
            "lease_id",
            "lease_until",
            "attempt_count",
            "receipt_attempt_count",
            "updated_at",
        ]
    )
    return delivery


def authorized(delivery, notification):
    if (
        notification.archived_at
        or not eligible_members(
            notification.organization_id,
            notification.kind,
            school_id=notification.school_id,
            recipient_id=notification.recipient_id,
            institution_wide=notification.school_id is None
            and notification.kind in INVITATION_KINDS,
        ).exists()
    ):
        return False
    stored = NotificationPreference.objects.filter(
        user_id=notification.recipient_id,
        organization_id=notification.organization_id,
        kind=notification.kind,
    ).first()
    if not preferences(notification.kind, stored)[delivery.channel.lower()]:
        return False
    if notification.kind == Kind.MEAL_SERVICE_REMINDER:
        meal = MealService.objects.filter(
            pk=notification.data.get("resource_id"),
            school_id=notification.school_id,
            status=MealService.Status.PLANNED,
        ).first()
        if meal is None:
            return False
        now = timezone.now()
        start = timezone.make_aware(datetime.combine(meal.date, meal.scheduled_time))
        return (
            now
            <= start
            <= now + timedelta(minutes=settings.NOTIFICATION_REMINDER_MINUTES)
        )
    return True


def send(delivery):
    notification = delivery.notification
    if not authorized(delivery, notification):
        return Status.CANCELLED, "", "access_or_preference"
    if delivery.channel == Channel.EMAIL:
        try:
            sent = EmailMessage(
                "Você tem uma atualização no Reali",
                "Abra o aplicativo Reali para consultar as notificações da sua instituição.",
                to=[notification.recipient.email],
                headers={"Message-ID": f"<{delivery.pk}@notifications.reali>"},
            ).send()
        except (SMTPException, OSError) as exc:
            raise DeliveryError("smtp_unavailable", retry=True) from exc
        if sent != 1:
            raise DeliveryError("smtp_unavailable", retry=True)
        return Status.ACCEPTED, "", ""
    device = PushDevice.objects.filter(
        pk=delivery.device_id,
        binding=delivery.binding,
        user_id=notification.recipient_id,
        is_active=True,
        session_expires_at__gt=timezone.now(),
        session_version=notification.recipient.session_version,
    ).first()
    if device is None:
        return Status.CANCELLED, "", "device_unavailable"
    try:
        push_token = cipher().decrypt(bytes(device.encrypted_token)).decode("ascii")
    except (InvalidToken, PushNotConfigured) as exc:
        raise DeliveryError("push_key_unavailable", retry=True) from exc
    result = expo_request(
        "send",
        {
            "to": push_token,
            "title": "Reali",
            "body": "Você tem uma atualização.",
            "data": {"notification_id": str(notification.pk)},
            "ttl": 3600,
            "channelId": "reali",
        },
    )
    validate_expo_result(result)
    reference = result.get("id")
    if not isinstance(reference, str) or not reference or len(reference) > 100:
        raise DeliveryError("expo_missing_ticket", retry=True)
    return Status.ACCEPTED, reference, ""


def receipt(delivery):
    reference = delivery.provider_reference
    result = expo_request("getReceipts", {"ids": [reference]})
    if reference not in result:
        return Status.ACCEPTED, reference, "receipt_pending"
    validate_expo_result(result[reference])
    return Status.CONFIRMED, reference, ""


@transaction.atomic
def finish(delivery, status, reference, error):
    now = timezone.now()
    next_attempt = now
    accepted_at = delivery.accepted_at
    if status == Status.ACCEPTED and reference:
        accepted_at = accepted_at or now
        next_attempt = min(now + RECEIPT_WAIT, accepted_at + DELIVERY_AGE)
    if status == Status.PENDING:
        accepted_at = None
        next_attempt = now + timedelta(seconds=60 * 2 ** (delivery.attempt_count - 1))
    elif status != Status.ACCEPTED or not reference:
        # SMTP acceptance is terminal and has no receipt processing.
        next_attempt = now + timedelta(days=3650)
    written = NotificationDelivery.objects.filter(
        pk=delivery.pk, lease_id=delivery.lease_id
    ).update(
        lease_id=None,
        lease_until=None,
        status=status,
        accepted_at=accepted_at,
        next_attempt_at=next_attempt,
        provider_reference=reference,
        last_error_code=error,
        updated_at=now,
    )
    if not written:
        return
    if delivery.device_id and status != Status.CANCELLED:
        devices = PushDevice.objects.filter(
            pk=delivery.device_id, binding=delivery.binding
        )
        if status == Status.CONFIRMED:
            devices.update(last_success_at=now)
        if error and error != "receipt_pending":
            updates = {"last_failure_at": now}
            if error == "DeviceNotRegistered":
                updates["is_active"] = False
            devices.update(**updates)
    if status in [Status.FAILED, Status.REJECTED]:
        log.warning(
            "notification_delivery_terminal id=%s channel=%s status=%s code=%s",
            delivery.pk,
            delivery.channel,
            status,
            error,
        )


def process(delivery):
    now = timezone.now()
    awaiting_receipt = delivery.status == Status.ACCEPTED
    cutoff = (
        delivery.accepted_at if awaiting_receipt else delivery.created_at
    ) + DELIVERY_AGE
    if now >= cutoff or delivery.attempt_count > MAX_ATTEMPTS:
        code = "receipt_timeout" if awaiting_receipt else "attempts_exhausted"
        finish(delivery, Status.FAILED, delivery.provider_reference, code)
        return
    try:
        result = receipt(delivery) if awaiting_receipt else send(delivery)
    except DeliveryError as exc:
        if awaiting_receipt and exc.retry and exc.code != "MessageRateExceeded":
            result = Status.ACCEPTED, delivery.provider_reference, exc.code
        elif exc.retry and delivery.attempt_count < MAX_ATTEMPTS:
            result = Status.PENDING, "", exc.code
        else:
            result = (
                Status.REJECTED if exc.rejected else Status.FAILED,
                delivery.provider_reference,
                exc.code,
            )
    finish(delivery, *result)


def process_due(limit):
    processed = 0
    for _ in range(limit):
        delivery = claim()
        if delivery is None:
            break
        process(delivery)
        processed += 1
    return processed
