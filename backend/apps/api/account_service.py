from datetime import timedelta

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.crypto import salted_hmac
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from apps.users.models import User, normalize_email

from .account_mail import account_link, send_account_mail
from .audit import audit
from .models import PasswordResetMail
from .permissions import MANAGEMENT_ROLES


class ResetTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{super()._make_hash_value(user, timestamp)}:{user.session_version}"


reset_tokens = ResetTokenGenerator()


def check_password_policy(user, password):
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise ValidationError({"password": exc.messages}) from exc


def invalidate_sessions(user):
    user.session_version += 1


def set_new_password(user, password, action):
    check_password_policy(user, password)
    user.set_password(password)
    invalidate_sessions(user)
    user.save(update_fields=["password", "session_version"])
    PasswordResetMail.objects.filter(user=user).delete()
    audit(action, user, actor=user)


@transaction.atomic
def change_password(user_id, current_password, password):
    user = User.objects.select_for_update().get(pk=user_id, is_active=True)
    if not user.check_password(current_password):
        raise ValidationError({"current_password": "Senha atual inválida."})
    set_new_password(user, password, "PASSWORD_CHANGED")


@transaction.atomic
def request_password_reset(email):
    email = normalize_email(email)
    key = salted_hmac("reali.password-reset-email", email).hexdigest()
    if not cache.add(f"reali-password-reset:{key}", True, timeout=300):
        return
    user = User.objects.select_for_update().filter(email=email, is_active=True).first()
    if user and user.has_usable_password():
        PasswordResetMail.objects.get_or_create(
            user=user, defaults={"session_version": user.session_version}
        )


@transaction.atomic
def claim_reset_mail():
    now = timezone.now()
    PasswordResetMail.objects.filter(created_at__lt=now - timedelta(hours=1)).delete()
    mail = (
        PasswordResetMail.objects.select_for_update()
        .filter(
            available_at__lte=now,
            attempts__lt=5,
        )
        .order_by("created_at")
        .first()
    )
    if mail:
        mail.attempts += 1
        mail.available_at = now + timedelta(minutes=5)
        mail.save(update_fields=["attempts", "available_at"])
    return mail


def process_reset_mail_batch(limit):
    sent = failed = 0
    account_link(settings.REALI_PASSWORD_RESET_URL, "configuration-check")
    for _ in range(limit):
        mail = claim_reset_mail()
        if mail is None:
            break
        user = mail.user
        if (
            not user.is_active
            or not user.has_usable_password()
            or user.session_version != mail.session_version
        ):
            mail.delete()
            continue
        token = f"{urlsafe_base64_encode(force_bytes(user.pk))}.{reset_tokens.make_token(user)}"
        link = account_link(settings.REALI_PASSWORD_RESET_URL, token)
        if send_account_mail(
            "password_reset",
            "Recuperação da sua conta Reali",
            user.email,
            {"link": link},
            reference=mail.pk,
        ):
            PasswordResetMail.objects.filter(
                pk=mail.pk, attempts=mail.attempts
            ).delete()
            sent += 1
        else:
            failed += 1
    return sent, failed


@transaction.atomic
def confirm_password_reset(token, password):
    try:
        uid, proof = token.split(".", 1)
        user_id = int(urlsafe_base64_decode(uid).decode())
        if not 0 < user_id <= 2**63 - 1:
            raise ValueError
    except ValueError as exc:
        raise ValidationError({"token": "Link inválido ou expirado."}) from exc
    user = User.objects.select_for_update().filter(pk=user_id, is_active=True).first()
    if not user or not reset_tokens.check_token(user, proof):
        raise ValidationError({"token": "Link inválido ou expirado."})
    set_new_password(user, password, "PASSWORD_RESET")


@transaction.atomic
def administer_account(actor, user_id, *, deactivate=False):
    from rest_framework.exceptions import NotFound

    user = User.objects.select_for_update().filter(pk=user_id).first()
    if not user:
        raise NotFound("Conta não encontrada.")
    if user.is_staff or user.is_superuser:
        raise ValidationError(
            "A administração de contas internas deve ocorrer pelo procedimento interno."
        )
    if (
        deactivate
        and user.memberships.filter(is_active=True, role__in=MANAGEMENT_ROLES).exists()
    ):
        raise ValidationError(
            "Transfira as funções de gestor antes de desativar a conta."
        )
    invalidate_sessions(user)
    if deactivate:
        user.is_active = False
    user.save(update_fields=["session_version", "is_active"])
    PasswordResetMail.objects.filter(user=user).delete()
    audit(
        "ACCOUNT_DEACTIVATED" if deactivate else "SESSIONS_REVOKED", user, actor=actor
    )
