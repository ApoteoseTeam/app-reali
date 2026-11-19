from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import ValidationError

from apps.api.account_service import process_reset_mail_batch


class Command(BaseCommand):
    help = "Processa e-mails pendentes de recuperação de senha em um lote."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        if options["limit"] < 1:
            raise CommandError("--limit deve ser positivo.")
        try:
            sent, failed = process_reset_mail_batch(options["limit"])
        except ValidationError as exc:
            raise CommandError(str(exc.detail)) from exc
        self.stdout.write(f"Aceitos pelo transporte: {sent}. Falhas: {failed}.")
