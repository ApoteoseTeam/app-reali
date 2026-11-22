from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cameras.monitoring import maintain_camera_health


class Command(BaseCommand):
    help = "Registra câmeras offline e expurga eventos fora da retenção configurada."

    def handle(self, *args, **options):
        offline, removed = maintain_camera_health(timezone.now())
        self.stdout.write(
            f"Transições offline: {offline}. Eventos expurgados: {removed}."
        )
