from django.db import migrations, models
from django.utils import timezone


def retire_invitation_roles(apps, schema_editor):
    pending = apps.get_model("api", "UserInvitation").objects.using(
        schema_editor.connection.alias
    ).filter(status="PENDING")
    pending.filter(role="ADMIN").update(role="DIRECTOR")
    pending.filter(role="TEACHER").update(status="REVOKED", revoked_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_auditlog_request_id_auditlog_school_and_more"),
        ("users", "0003_remove_admin_teacher"),
    ]

    operations = [
        # Keep access decisions on rollback to avoid reactivating retired roles.
        migrations.RunPython(retire_invitation_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="userinvitation",
            name="role",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("DIRECTOR", "Diretor"),
                    ("MANAGER", "Gestor"),
                    ("NUTRITIONIST", "Nutricionista"),
                    ("COOK", "Merendeira(o)"),
                    ("SECRETARIAT", "Secretaria de Educação"),
                ],
            ),
        ),
    ]
