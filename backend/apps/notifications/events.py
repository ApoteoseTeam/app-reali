from django.conf import settings

from .models import Kind
from .services import eligible_members, publish

MEAL_MESSAGES = {
    Kind.MEAL_SERVICE_REMINDER: (
        "Horário da merenda próximo",
        "Um serviço programado está próximo do horário previsto.",
    ),
    Kind.MEAL_SERVICE_STARTED: (
        "Preparo iniciado",
        "O preparo do serviço de merenda foi iniciado.",
    ),
    Kind.MEAL_SERVING_STARTED: (
        "Distribuição iniciada",
        "A distribuição das refeições foi iniciada.",
    ),
    Kind.MEAL_SERVICE_FINISHED: (
        "Serviço finalizado",
        "O serviço de merenda foi finalizado.",
    ),
    Kind.MEAL_SERVICE_CANCELLED: (
        "Serviço cancelado",
        "Um serviço de merenda foi cancelado.",
    ),
    Kind.FORECAST_UNAVAILABLE: (
        "Previsão indisponível",
        "A previsão do serviço está indisponível. Confira os dados registrados.",
    ),
    Kind.FORECAST_DIFFERENCE: (
        "Diferença entre previsão e pratos servidos",
        "A diferença entre previsão e pratos servidos ultrapassou o limite configurado.",
    ),
}


def meal_event(meal, kind):
    title, message = MEAL_MESSAGES[kind]
    publish(
        kind,
        organization_id=meal.school.organization_id,
        school_id=meal.school_id,
        key=f"{kind}:{meal.pk}",
        title=title,
        message=message,
        data={"resource": "meal", "resource_id": str(meal.pk)},
    )


def forecast_difference(meal, values):
    if not values["comparison_eligible"]:
        return
    predicted = values["total_forecast_plates"]
    if predicted is None or predicted <= 0:
        return
    difference = values["absolute_error"]
    if (
        difference >= settings.NOTIFICATION_FORECAST_MIN_DIFFERENCE
        and difference * 100
        >= predicted * settings.NOTIFICATION_FORECAST_DIFFERENCE_PERCENT
    ):
        meal_event(meal, Kind.FORECAST_DIFFERENCE)


def invitation_event(invite, kind, stage):
    from apps.api.invitation_service import manageable_invitations

    actor = eligible_members(
        invite.organization_id, kind, recipient_id=invite.invited_by_id
    ).first()
    if actor is None or not manageable_invitations(actor).filter(pk=invite.pk).exists():
        return
    messages = {
        "created": "O convite foi criado.",
        "resent": "O convite foi reenviado.",
        "accepted": "O convite foi aceito.",
        "revoked": "O convite foi revogado.",
        "expiring": "O convite expira nas próximas 12 horas.",
        "expired": "O prazo de ativação do convite terminou.",
    }
    school_ids = (
        [None]
        if invite.all_schools_access
        else invite.schools.values_list("pk", flat=True)
    )
    for school_id in school_ids:
        publish(
            kind,
            organization_id=invite.organization_id,
            school_id=school_id,
            recipient_id=actor.user_id,
            key=f"invitation:{invite.pk}:{invite.expires_at.isoformat()}:{stage}:{school_id}",
            title=kind.label,
            message=messages[stage],
        )


def membership_event(member):
    if member.is_active:
        publish(
            Kind.MEMBERSHIP_UPDATED,
            organization_id=member.organization_id,
            recipient_id=member.user_id,
            key=f"membership:{member.pk}:{member.updated_at.isoformat()}",
            title="Vínculo institucional atualizado",
            message="Confira seu acesso institucional no aplicativo.",
        )


def adjustment_event(adjustment):
    publish(
        Kind.COUNT_ADJUSTMENT_CREATED,
        organization_id=adjustment.school.organization_id,
        school_id=adjustment.school_id,
        key=f"adjustment:{adjustment.pk}",
        title="Correção de contagem registrada",
        message="Uma reversão foi registrada."
        if adjustment.reversal_of_id
        else "Um ajuste manual foi registrado.",
    )


def metrics_event(row, kind, *, key):
    reconciled = kind == Kind.DATA_RECONCILED
    publish(
        kind,
        organization_id=row.school.organization_id,
        school_id=row.school_id,
        key=key,
        title="Indicadores reconciliados"
        if reconciled
        else "Indicadores aguardando atualização",
        message=f"Os indicadores de {row.reference_date:%d/%m/%Y} foram atualizados."
        if reconciled
        else f"Os indicadores de {row.reference_date:%d/%m/%Y} aguardam consolidação.",
        data={"resource": "reports"},
    )
