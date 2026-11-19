# Contrato de planejamento para React Native

Base `/api/v1/`. Envie `Authorization: Bearer <access>` e `X-Organization-ID: <uuid>`. Listas usam `count`, `next`, `previous` e `results`. Serviços e previsões aceitam `school`, `date`, `meal_type` e `status`. Programações e políticas aceitam `school` e `meal_type`.

| Método e caminho | Sucesso |
|---|---|
| `GET /meal-services/` e `POST /meal-services/` | `200` lista ou `201` criação |
| `GET /meal-services/{id}/`, `PATCH /meal-services/{id}/`, `PUT /meal-services/{id}/` | `200` |
| `POST /meal-services/{id}/start/` | `200`, serviço com snapshot e previsão, inclusive em repetição durante preparo |
| `POST /meal-services/{id}/start-serving/` e `/finish/` | `200` com serviço atualizado |
| `POST /meal-services/{id}/cancel/` | `200` com serviço atualizado. Corpo `{"reason":"Motivo"}` |
| `GET /meal-services/{id}/attendance-snapshot/` | `200` com snapshot |
| `GET /meal-services/{id}/forecast/` e `GET /meal-forecasts/` | `200` com previsão ou listagem |
| `GET /meal-schedules/`, `POST /meal-schedules/`, `GET /meal-schedules/{id}/`, `PATCH /meal-schedules/{id}/` | `200` ou `201` |
| `POST /meal-schedules/{id}/generate/` | `201` na geração ou `200` em repetição |
| `GET /meal-forecast-policies/`, `POST /meal-forecast-policies/`, `GET /meal-forecast-policies/{id}/`, `PATCH /meal-forecast-policies/{id}/` | `200` ou `201` |

A criação de serviço recebe `school`, `date`, `meal_type`, `scheduled_time` e, opcionalmente, `scheduled_end_time`, `entry_window_start` e `history_excluded`. A criação de política recebe `school`, `meal_type`, `initial_rate` (pode ser `null`), `minimum_history` e `history_days`. Consulte [programações](MEAL_SCHEDULES.md) para um exemplo de configuração semanal.

Envie `{}` para iniciar o preparo. A taxa opcional `estimated_plates_per_entry` exige papel de direção ou gestão. Um novo envio durante preparo mantém os valores gravados na primeira operação.

Exemplo resumido de resposta.

```json
{
  "id": "061fb66c-8ae6-437b-abd7-1d4b6d079203",
  "meal_service_id": "061fb66c-8ae6-437b-abd7-1d4b6d079203",
  "status": "PREPARING",
  "preparation_started_at": "2026-11-18T09:00:00-03:00",
  "attendance_snapshot": {
    "total_student_entries": 420,
    "cutoff_at": "2026-11-18T09:00:00-03:00",
    "data_quality_status": "COMPLETE"
  },
  "forecast": {
    "forecast_plates": 391,
    "predicted_plates": 391,
    "estimated_plates_per_entry": "0.930",
    "conversion_rate": "0.930",
    "method": "HISTORICAL_RATE",
    "algorithm_version": "reali-meal-v1",
    "confidence_status": "SUFFICIENT"
  }
}
```

O frontend usa os números calculados no backend. Exiba a confiança e a qualidade. Quando a previsão for `UNAVAILABLE`, apresente indisponibilidade com base em `parameters.reason`. Um zero numérico representa um resultado calculado.

`400` representa validação dos campos. `401` e `403` representam autenticação ou permissão. `404` indica recurso fora do escopo, inexistente ou previsão/snapshot ainda não criado. Conflitos usam `409`, com `code` e `detail`. Códigos possíveis incluem `INVALID_TRANSITION`, `MEAL_SLOT_CONFLICT`, `SCHEDULE_OVERLAP`, `SCHEDULE_NOT_APPLICABLE`, `POLICY_EXISTS`, `CANCELLATION_NOT_ALLOWED`, `SERVICE_DATE_IN_FUTURE` e `LEGACY_PREPARATION_INCOMPLETE`. O código `SCHOOL_UNAVAILABLE` acompanha `403` em operações sobre escola inativa.
