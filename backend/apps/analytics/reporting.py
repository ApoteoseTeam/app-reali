from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import TruncMonth, TruncWeek
from rest_framework.exceptions import ValidationError

from apps.meals.models import MealService

from .models import PendingDailyMetrics
from .selectors import daily_rows, errors, meal_metrics, meal_rows, performance


def day_scope(schools, start, end, *, entry_only=False):
    rows = daily_rows(schools).filter(reference_date__range=(start, end))
    if entry_only:
        rows = rows.exclude(has_entries=False)
    return rows


def filtered_meals(schools, filters):
    rows = meal_rows(schools).filter(
        date__range=(filters["start_date"], filters["end_date"])
    )
    for name in ("meal_type", "status"):
        if name in filters:
            rows = rows.filter(**{name: filters[name]})
    return rows


def bucket_date(day, group):
    if group == "weekly":
        return day - timedelta(days=day.weekday())
    if group == "monthly":
        return day.replace(day=1)
    return day


def add_bucket_data(values, coverage, expected, entry_only):
    predicted, served = (
        values.get("total_forecast_plates"),
        values.get("total_served_plates"),
    )
    return {
        "total_student_entries": values.get("total_student_entries"),
        "total_forecast_plates": None if entry_only else predicted,
        "total_served_plates": None if entry_only else served,
        **errors(None if entry_only else predicted, None if entry_only else served),
        **performance(
            values.get("compared", 0) if not entry_only else 0,
            values.get("absolute", 0),
            values.get("compared_actual", 0),
        ),
        "coverage": coverage,
        "expected": expected,
        "data_status": "NO_DATA" if not coverage else "PROVISIONAL",
        "calculated_at": None if entry_only else values.get("last_calculated"),
        "stale": None if entry_only else bool(values.get("stale_days", 0)),
    }


def daily_rollups(schools, filters, *, group=None, by_school=False, entry_only=False):
    start, end = filters["start_date"], filters["end_date"]
    rows = day_scope(schools, start, end, entry_only=entry_only)
    bucket = {"weekly": TruncWeek, "monthly": TruncMonth, "daily": F}.get(group)
    pending = PendingDailyMetrics.objects.filter(
        school__in=schools,
        reference_date__range=(start, end),
    )
    if bucket:
        rows = rows.annotate(bucket=bucket("reference_date"))
        pending = pending.annotate(bucket=bucket("reference_date"))
    dimensions = ["school_id"] if by_school else ["bucket"] if group else []
    stats = {
        "total_student_entries": Sum(
            "total_student_entries", filter=~Q(has_entries=False)
        ),
        "coverage": Count(
            "pk", filter=~Q(has_entries=False, has_forecast=False, has_served=False)
        ),
    }
    if not entry_only:
        stats |= {
            "total_forecast_plates": Sum(
                "total_forecast_plates", filter=~Q(has_forecast=False)
            ),
            "total_served_plates": Sum(
                "total_served_plates", filter=~Q(has_served=False)
            ),
            "compared": Sum("compared_services", default=0),
            "absolute": Sum("sum_absolute_error", default=0),
            "compared_actual": Sum("compared_served", default=0),
            "complete_days": Count("pk", filter=Q(is_complete=True, stale=False)),
            "revised_days": Count("pk", filter=Q(data_status="REVISED")),
            "projected_stale": Count("pk", filter=Q(stale=True)),
            "last_calculated": Max("calculated_at"),
        }
    if dimensions:
        indexed = {
            value[dimensions[0]]: value
            for value in rows.order_by().values(*dimensions).annotate(**stats)
        }
    else:
        indexed = {None: rows.aggregate(**stats)}
    stale = set()
    if not entry_only:
        if dimensions:
            stale = set(
                pending.order_by().values_list(dimensions[0], flat=True).distinct()
            )
        elif pending.exists():
            stale = {None}
    school_count = schools.count() if not by_school else 0
    days = (end - start).days + 1
    if by_school:
        expected = {
            key: days for key in schools.order_by("id").values_list("id", flat=True)
        }
    elif group:
        expected = defaultdict(int)
        for index in range(days):
            expected[bucket_date(start + timedelta(days=index), group)] += school_count
    else:
        expected = {None: days * school_count}
    result = []
    for key, size in expected.items():
        values = indexed.get(key, {})
        coverage = values.get("coverage", 0)
        row = add_bucket_data(
            {**values, "stale_days": key in stale or values.get("projected_stale", 0)},
            coverage,
            size,
            entry_only,
        )
        if (
            not entry_only
            and size > 0
            and not row["stale"]
            and values.get("complete_days") == size
        ):
            row["data_status"] = "REVISED" if values.get("revised_days") else "COMPLETE"
        if group:
            row["date"] = key
        if by_school:
            row["school_id"] = key
        result.append(row)
    return result


def report_rollups(schools, filters, *, group=None, by_school=False, entry_only=False):
    if not {"meal_type", "status"} & filters.keys():
        return daily_rollups(
            schools, filters, group=group, by_school=by_school, entry_only=entry_only
        )
    if entry_only:
        raise ValidationError(
            "Filtros de refeição exigem acesso aos indicadores de serviço."
        )
    rows = list(filtered_meals(schools, filters).order_by("date", "id")[:5001])
    if len(rows) > 5000:
        raise ValidationError("Reduza o período ou selecione uma escola.")
    groups = defaultdict(list)
    for meal in rows:
        key = (
            meal.school_id
            if by_school
            else bucket_date(meal.date, group)
            if group
            else None
        )
        groups[key].append(meal_metrics(meal))
    source = daily_rollups(schools, filters, group=group, by_school=by_school)
    key_field = "school_id" if by_school else "date" if group else None
    indexed = {row.get(key_field): row for row in source}
    keys = (
        list(schools.order_by("id").values_list("pk", flat=True))
        if by_school
        else sorted(indexed)
        if group
        else [None]
    )
    result = []
    for key in keys:
        meals = groups[key]
        operational = [
            row for row in meals if row["status"] != MealService.Status.CANCELLED
        ]
        compared = [row for row in operational if row["comparison_eligible"]]
        values = {
            "compared": len(compared),
            "absolute": sum(row["absolute_error"] for row in compared),
            "compared_actual": sum(row["total_served_plates"] for row in compared),
        }
        for name in ("total_forecast_plates", "total_served_plates"):
            known = [row[name] for row in operational if row[name] is not None]
            values[name] = sum(known) if known else None
        daily = indexed[key]
        values["stale_days"] = daily["stale"]
        values["last_calculated"] = daily["calculated_at"]
        item = add_bucket_data(values, len(meals), len(meals), False)
        if (
            operational
            and daily["data_status"] in {"COMPLETE", "REVISED"}
            and all(
                row["status"] == MealService.Status.FINISHED
                and row["total_served_plates"] is not None
                for row in operational
            )
        ):
            item["data_status"] = daily["data_status"]
        if group:
            item["date"] = key
        if by_school:
            item["school_id"] = key
        result.append(item)
    return result
