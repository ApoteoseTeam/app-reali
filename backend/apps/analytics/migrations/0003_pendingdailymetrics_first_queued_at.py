from django.db import migrations, models
from django.db.models.functions import Now
from django.utils import timezone


def copy_queue_time(apps, schema_editor):
    pending = apps.get_model("analytics", "PendingDailyMetrics")
    pending.objects.using(schema_editor.connection.alias).update(
        first_queued_at=models.F("queued_at")
    )


class Migration(migrations.Migration):
    dependencies = [("analytics", "0002_dailymetrics_compared_served_and_more")]
    operations = [
        migrations.AddField(
            model_name="pendingdailymetrics",
            name="first_queued_at",
            field=models.DateTimeField(
                default=timezone.now, db_default=Now(), db_index=True
            ),
        ),
        migrations.RunPython(copy_queue_time, migrations.RunPython.noop),
    ]
