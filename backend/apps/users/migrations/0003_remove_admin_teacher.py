from django.db import migrations, models


def retire_roles(apps, schema_editor):
    memberships = apps.get_model("users", "Membership").objects.using(
        schema_editor.connection.alias
    )
    memberships.filter(role="ADMIN").update(role="DIRECTOR")
    memberships.filter(role="TEACHER", is_active=True).update(is_active=False)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_schoolaccess_membership_all_schools_access_and_more"),
    ]

    operations = [
        # Keep access decisions on rollback to avoid reactivating retired roles.
        migrations.RunPython(retire_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="membership",
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
