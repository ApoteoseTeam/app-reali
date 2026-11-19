import logging
from urllib.parse import urlencode, urlsplit, urlunsplit

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


def account_link(base, token):
    try:
        parsed = urlsplit(base)
        if (
            parsed.scheme == "https"
            and parsed.hostname
            and not parsed.fragment
            and not parsed.username
        ):
            return urlunsplit(parsed._replace(fragment=urlencode({"token": token})))
    except ValueError:
        pass
    raise ValidationError("Configure um endereço HTTPS válido para esta operação.")


def send_account_mail(kind, subject, recipient, context, *, reference):
    try:
        message = EmailMultiAlternatives(
            subject,
            render_to_string(f"account_mail/{kind}.txt", context),
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
        )
        message.attach_alternative(
            render_to_string(f"account_mail/{kind}.html", context), "text/html"
        )
        if message.send(fail_silently=False) == 1:
            return True
    except Exception:
        # Avoid logging provider exceptions that can include recipients or message content.
        pass
    logger.warning(
        "Falha no transporte de e-mail Reali (%s, referência %s).", kind, reference
    )
    return False
