from uuid import UUID

from django.db import migrations


TYPES = {
    "ATTENDANCE_SNAPSHOT_": "meals.attendancesnapshot",
    "DAILY_METRICS_": "analytics.dailymetrics",
    "ANALYTICS_REPORT_": "institutions.organization",
    "MEAL_SERVING_": "meals.mealservice",
    "MEAL_PREPARATION_": "meals.mealservice",
    "MEAL_SERVICE_": "meals.mealservice",
    "MEAL_SCHEDULE_": "meals.mealschedule",
    "MEAL_FORECAST_POLICY_": "meals.mealforecastpolicy",
    "MEAL_FORECAST_": "meals.mealforecast",
    "DEVICE_CREDENTIAL_": "cameras.devicecredential",
    "EDGE_DEVICE_": "cameras.edgedevice",
    "CAMERA_": "cameras.camera",
    "INVITATION_": "api.userinvitation",
    "MEMBERSHIP_": "users.membership",
    "SCHOOL_ACCESS_": "users.membership",
}


def link_history(apps, schema_editor):
    db = schema_editor.connection.alias
    audit_log = apps.get_model("api", "AuditLog").objects.using(db)
    adjustments = apps.get_model("counting", "CountAdjustment").objects.using(db)
    schools = apps.get_model("institutions", "School").objects.using(db)
    scopes = dict(schools.values_list("id", "organization_id"))
    for entry in (
        audit_log.filter(target_type="")
        .order_by("created_at", "pk")
        .iterator(chunk_size=500)
    ):
        try:
            school_id = UUID(entry.details.get("school_id") or "")
        except (ValueError, TypeError, AttributeError):
            school_id = None
        target = next(
            (
                label
                for prefix, label in TYPES.items()
                if entry.action.startswith(prefix)
            ),
            "",
        )
        if entry.action in {"COUNT_ADJUSTMENT_CREATED", "COUNT_ADJUSTMENT_REVERSED"}:
            target = "counting.countadjustment"
            try:
                adjustment_id = UUID(entry.object_id)
            except (ValueError, TypeError):
                continue
            adjustment = adjustments.filter(
                pk=adjustment_id, school__organization_id=entry.organization_id
            ).first()
            if adjustment:
                school_id = adjustment.school_id
                if adjustment.audit_log_id is None:
                    adjustments.filter(pk=adjustment_id).update(audit_log_id=entry.pk)
        if school_id is not None and scopes.get(school_id) != entry.organization_id:
            school_id = None
        if target or school_id:
            audit_log.filter(pk=entry.pk).update(
                school_id=school_id, target_type=target
            )


class Migration(migrations.Migration):
    dependencies = [("counting", "0004_countadjustment_audit_log_and_more")]
    operations = [migrations.RunPython(link_history, migrations.RunPython.noop)]
