from datetime import date, timedelta
from functools import wraps
from typing import Literal
from uuid import UUID

from django.db import DatabaseError
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.analytics.reporting import filtered_meals, report_rollups
from apps.analytics.selectors import meal_metrics, percent
from apps.institutions.models import School
from apps.meals.models import MealForecast, MealService
from apps.users.models import Membership

from .errors import AIError

Metric = Literal[
    "entries", "forecast", "served", "difference", "absolute_error", "mae", "wape"
]
MealType = Literal["BREAKFAST", "LUNCH", "SNACK", "DINNER"]
Group = Literal["daily", "weekly", "monthly"]
METRICS = {
    "entries": "total_student_entries",
    "forecast": "total_forecast_plates",
    "served": "total_served_plates",
    "difference": "forecast_difference",
    "absolute_error": "absolute_error",
    "mae": "mae",
    "wape": "wape",
}
LABELS = {
    "total_student_entries": "entradas registradas",
    "total_forecast_plates": "pratos previstos",
    "total_served_plates": "pratos servidos",
    "forecast_difference": "desvio (previsão menos distribuição)",
    "absolute_error": "erro absoluto do total",
    "sum_absolute_error": "soma dos erros absolutos por serviço",
    "percentage_error": "erro percentual (%)",
    "mae": "MAE em pratos",
    "wape": "WAPE (%)",
    "compared_services": "serviços comparados",
    "snapshot_entries": "entradas consideradas no preparo",
}


def tool_query(func):
    @wraps(func)
    def query(self, *args, **kwargs):
        self.attempts.append({"tool": func.__name__})
        attempt = self.attempts[-1]
        try:
            if len(self.attempts) > self.limit:
                raise AIError("AI_RATE_LIMITED")
            self.scope.fresh()
            return func(self, *args, **kwargs)
        except AIError as exc:
            attempt["code"] = exc.code
        except (ValueError, TypeError, ValidationError):
            attempt["code"] = "AI_INVALID_ARGUMENTS"
        except DatabaseError:
            attempt["code"] = "AI_TOOL_ERROR"
        return {"error": attempt["code"]}

    return query


class QueryTools:
    def __init__(self, scope, limit):
        self.scope = scope
        self.limit = limit
        self.evidence = []
        self.attempts = []

    def available(self):
        tools = [
            self.get_student_counts,
            self.get_plate_counts,
            self.get_meal_forecasts,
            self.get_daily_metrics,
            self.get_meal_service_metrics,
            self.compare_periods,
            self.get_school_performance,
        ]
        if self.scope.role != Membership.Role.COOK and self.scope.school_id is None:
            tools.append(self.compare_schools)
        return tools

    def period(self, start_date, end_date):
        today = timezone.localdate()
        start = date.fromisoformat(start_date) if start_date else today
        end = date.fromisoformat(end_date) if end_date else start
        earliest = (
            today - timedelta(days=29)
            if self.scope.role == Membership.Role.COOK
            else date(1900, 1, 1)
        )
        if (
            (start_date and start_date != start.isoformat())
            or (end_date and end_date != end.isoformat())
            or not earliest <= start <= end <= today
            or (end - start).days >= 93
        ):
            raise AIError("AI_INVALID_ARGUMENTS")
        return {"start_date": start, "end_date": end}

    def schools(self, school_id):
        schools = School.objects.filter(
            pk__in=self.scope.school_ids,
            is_active=True,
            organization_id=self.scope.organization_id,
        )
        if school_id:
            key = UUID(school_id)
            if key not in self.scope.school_ids:
                raise AIError("AI_PERMISSION_DENIED")
            return schools.filter(pk=key)
        return schools

    def scope_school(self, school_id):
        return (
            str(school_id or self.scope.school_id)
            if school_id or self.scope.school_id
            else None
        )

    def record(self, source_type, school_id, period, rows, *, truncated=False):
        source = {
            "ref": len(self.evidence) + 1,
            "type": source_type,
            "school_id": self.scope_school(school_id),
            "period": period,
        }
        evidence = {"source": source, "rows": rows, "truncated": truncated}
        self.evidence.append(evidence)
        return evidence

    def rollups(self, school_id, period, *, group=None, meal_type=None):
        if meal_type and meal_type not in MealService.MealType.values:
            raise AIError("AI_INVALID_ARGUMENTS")
        filters = {**period, **({"meal_type": meal_type} if meal_type else {})}
        return report_rollups(self.schools(school_id), filters, group=group)

    def services(self, school_id, period, meal_type, meal_service_id=None):
        self.scope.require("meal_history")
        if meal_type and meal_type not in MealService.MealType.values:
            raise AIError("AI_INVALID_ARGUMENTS")
        filters = {**period, **({"meal_type": meal_type} if meal_type else {})}
        # A meal UUID remains bounded by the selected school and the requested dates.
        rows = filtered_meals(self.schools(school_id), filters).exclude(
            status=MealService.Status.CANCELLED
        )
        if meal_service_id:
            rows = rows.filter(pk=UUID(meal_service_id))
        return rows.order_by("-date", "scheduled_time", "pk")

    @staticmethod
    def compact(row, fields):
        keep = (
            *fields,
            "coverage",
            "expected",
            "data_status",
            "calculated_at",
            "stale",
            "date",
        )
        return {name: row[name] for name in keep if name in row}

    @staticmethod
    def meal_row(meal, fields):
        row = meal_metrics(meal)
        return {
            "meal_service_id": str(meal.pk),
            "school_id": str(meal.school_id),
            "date": meal.date,
            "meal_type": meal.meal_type
            if meal.meal_type in MealService.MealType.values
            else None,
            "status": meal.status if meal.status in MealService.Status.values else None,
            "data_status": row["data_quality"]
            if row["data_quality"]
            in {"UNKNOWN", "COMPLETE", "PARTIAL", "STALE", "UNAVAILABLE"}
            else "UNKNOWN",
            **{name: row[name] for name in fields},
        }

    @tool_query
    def get_student_counts(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
    ) -> dict:
        """Consulta entradas registradas, não presença individual. Datas ISO inclusivas. Sem datas usa hoje."""
        self.scope.require("indicators")
        period = self.period(start_date, end_date)
        rows = self.rollups(school_id, period)
        return self.record(
            "STUDENT_COUNTS",
            school_id,
            period,
            [self.compact(row, [METRICS["entries"]]) for row in rows],
        )

    @tool_query
    def get_plate_counts(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
        meal_type: MealType | None = None,
        meal_service_id: str | None = None,
    ) -> dict:
        """Consulta pratos efetivamente servidos. Pode filtrar por tipo de refeição ou UUID do serviço."""
        self.scope.require("meal_history")
        period = self.period(start_date, end_date)
        if meal_service_id:
            meals = self.services(school_id, period, meal_type, meal_service_id)
            rows = [self.meal_row(meal, [METRICS["served"]]) for meal in meals]
        else:
            rows = [
                self.compact(row, [METRICS["served"]])
                for row in self.rollups(school_id, period, meal_type=meal_type)
            ]
            if meal_type:
                rows[0]["meal_type"] = meal_type
        return self.record("PLATE_COUNTS", school_id, period, rows)

    @tool_query
    def get_meal_forecasts(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
        meal_type: MealType | None = None,
    ) -> dict:
        """Lista previsões originais, método, confiabilidade e entradas do snapshot. Até oito serviços."""
        self.scope.require("forecast")
        period = self.period(start_date, end_date)
        meals = list(
            self.services(school_id, period, meal_type).filter(forecast__isnull=False)[
                :9
            ]
        )
        results = []
        for meal in meals[:8]:
            forecast = meal.forecast
            snapshot = meal.attendance_snapshot
            row = self.meal_row(meal, [METRICS["forecast"], "snapshot_entries"])
            row["forecast_method"] = (
                forecast.method
                if forecast.method in MealForecast.Method.values
                else None
            )
            row["confidence"] = (
                forecast.confidence_status
                if forecast.confidence_status in MealForecast.Confidence.values
                else None
            )
            row["snapshot_at"] = snapshot.reference_time
            results.append(row)
        return self.record(
            "MEAL_FORECASTS", school_id, period, results, truncated=len(meals) > 8
        )

    @tool_query
    def get_daily_metrics(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
    ) -> dict:
        """Consulta um resumo consolidado de entradas, previsão, distribuição e erros no intervalo."""
        self.scope.require("indicators")
        period = self.period(start_date, end_date)
        rows = self.rollups(school_id, period)
        return self.record(
            "DAILY_METRICS",
            school_id,
            period,
            [self.compact(row, LABELS) for row in rows],
        )

    @tool_query
    def get_meal_service_metrics(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
        meal_type: MealType | None = None,
        meal_service_id: str | None = None,
    ) -> dict:
        """Lista distribuição e erro por serviço de merenda. Aceita tipo e UUID. Até oito serviços."""
        period = self.period(start_date, end_date)
        meals = list(self.services(school_id, period, meal_type, meal_service_id)[:9])
        fields = (
            "snapshot_entries",
            "total_forecast_plates",
            "total_served_plates",
            "forecast_difference",
            "absolute_error",
            "percentage_error",
        )
        rows = [self.meal_row(meal, fields) for meal in meals[:8]]
        return self.record(
            "MEAL_SERVICE_METRICS", school_id, period, rows, truncated=len(meals) > 8
        )

    @tool_query
    def compare_periods(
        self,
        start_date: str,
        end_date: str,
        previous_start_date: str,
        previous_end_date: str,
        metric: Metric,
        school_id: str | None = None,
        meal_type: MealType | None = None,
    ) -> dict:
        """Compara dois intervalos inclusivos. Variação relativa ao período anterior, quando definida."""
        self.scope.require("indicators")
        if metric not in METRICS or (metric == "entries" and meal_type):
            raise AIError("AI_INVALID_ARGUMENTS")
        current = self.period(start_date, end_date)
        previous = self.period(previous_start_date, previous_end_date)
        field = METRICS[metric]
        periods = [current, previous]
        rows = []
        for period in periods:
            row = self.rollups(school_id, period, meal_type=meal_type)[0]
            rows.append(
                {
                    **self.compact(row, [field, "compared_services"]),
                    "period": period,
                }
            )
        first, second = (row[field] for row in rows)
        if first is not None and second is not None:
            rows[0]["delta"] = first - second
            rows[0]["delta_absolute"] = abs(first - second)
            rows[0]["delta_percent"] = (
                percent(first - second, abs(second)) if second else None
            )
        return self.record(
            "PERIOD_COMPARISON", school_id, {**current, "previous": previous}, rows
        )

    @tool_query
    def get_school_performance(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        school_id: str | None = None,
        meal_type: MealType | None = None,
        group: Group = "weekly",
        selection: Literal["evolution", "largest_error", "incomplete"] = "evolution",
    ) -> dict:
        """Série de previsão, distribuição, MAE e WAPE. Pode destacar maiores erros absolutos ou períodos incompletos."""
        self.scope.require("meal_history")
        period = self.period(start_date, end_date)
        if group not in {"daily", "weekly", "monthly"} or selection not in {
            "evolution",
            "largest_error",
            "incomplete",
        }:
            raise AIError("AI_INVALID_ARGUMENTS")
        rows = self.rollups(school_id, period, meal_type=meal_type, group=group)
        if selection == "largest_error":
            rows = sorted(
                (row for row in rows if row["absolute_error"] is not None),
                key=lambda row: (-row["absolute_error"], row["date"]),
            )
        if selection == "incomplete":
            rows = [
                row for row in rows if row["data_status"] not in {"COMPLETE", "REVISED"}
            ]
        if selection == "evolution" and len(rows) > 8:
            selected = rows[-8:]
        else:
            selected = rows[:8]
        fields = (
            "total_forecast_plates",
            "total_served_plates",
            "forecast_difference",
            "absolute_error",
            "mae",
            "wape",
            "compared_services",
        )
        return self.record(
            "SCHOOL_PERFORMANCE",
            school_id,
            period,
            [self.compact(row, fields) for row in selected],
            truncated=len(rows) > 8,
        )

    @tool_query
    def compare_schools(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        meal_type: MealType | None = None,
        offset: int = 0,
    ) -> dict:
        """Compara até oito escolas autorizadas por página, com volume, cobertura e amostras. Sem ranking."""
        self.scope.require("analytics_reports")
        if self.scope.school_id:
            raise AIError("AI_PERMISSION_DENIED")
        period = self.period(start_date, end_date)
        if not 0 <= offset <= 10000:
            raise AIError("AI_INVALID_ARGUMENTS")
        schools = self.schools(None)
        keys = list(
            schools.order_by("id").values_list("pk", flat=True)[offset : offset + 9]
        )
        filters = {**period, **({"meal_type": meal_type} if meal_type else {})}
        rows = report_rollups(schools.filter(pk__in=keys[:8]), filters, by_school=True)
        fields = (
            "total_forecast_plates",
            "total_served_plates",
            "mae",
            "wape",
            "compared_services",
        )
        result = [
            {**self.compact(row, fields), "school_id": str(row["school_id"])}
            for row in rows
        ]
        return self.record(
            "SCHOOL_COMPARISON", None, period, result, truncated=len(keys) > 8
        )
