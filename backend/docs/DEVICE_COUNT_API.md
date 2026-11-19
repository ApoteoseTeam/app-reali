# API de eventos e consultas

O agente envia `Authorization: Device <token>` e `Content-Type: application/json`. O agente e a atribuição da câmera determinam a escola. Campos extras são rejeitados. A quantidade é um inteiro JSON entre 1 e 100.000 e representa um incremento.

```http
POST /api/v1/device/counts/ HTTP/1.1
Host: api.example.invalid
Authorization: Device <token>
Content-Type: application/json

{"event_id":"portaria-000001","camera_id":"1d2c7ed6-768a-4f35-9471-3b2e7bf61c06","event_type":"STUDENT_ENTRY","recorded_at":"2026-11-18T07:30:00-03:00","quantity":8}
```

Para pratos, use a câmera da cantina, `event_type: "PLATE_SERVED"` e inclua `meal_service_id` com o UUID do serviço efetivo.

```json
{"event_id":"cantina-000025","camera_id":"bcf2ef68-750d-4af0-ac5a-9d8330769309","event_type":"PLATE_SERVED","meal_service_id":"98f0b682-0743-45b2-92ac-3730c0edadff","recorded_at":"2026-11-18T11:45:00-03:00","quantity":12}
```

Use o horário real da instalação. Os valores acima ilustram o formato. HTTP `201` retorna `{"status":"created","event_id":"portaria-000001","processed":true,"duplicate":false,"id":"<UUID da contagem>"}`. HTTP `200` usa `already_processed` e `duplicate:true`. O mesmo ID com conteúdo distinto retorna `409` e `{"error":{"code":"EVENT_CONFLICT","message":"O identificador do evento já foi utilizado com dados diferentes."}}`.

## Lotes e erros

`POST /api/v1/device/counts/batch/` recebe `{"events":[ <evento>, <evento> ]}` e aceita autenticação de agente. Um envelope válido retorna `200` com `status` como `processed`, `partial` ou `rejected`, os totais `accepted` e `rejected` e `results` na mesma ordem. Cada resultado inclui `index` iniciado em zero, `http_status`, `event_id` e a confirmação ou erro. HTTP `200` do envelope pode conter rejeições. Uma falha de armazenamento reverte os itens aceitos daquela requisição e permite reenviar o lote.

| HTTP | Significado |
|---|---|
| `400` | Payload inválido, tipo incompatível ou evento fora do limite temporal global |
| `401` | Credencial do agente ausente, inválida, revogada ou expirada |
| `403` | Câmera atribuída está desabilitada ou chave legada recusada |
| `404` | Câmera ou serviço fora do escopo, inclusive inexistente |
| `409` | Identificador conflitante ou serviço fora do estado/horário permitido |
| `413` | Corpo ultrapassa o limite |
| `415` | Formato de corpo incompatível |
| `429` | Frequência excedida |
| `500` ou `503` | Ingestão inesperadamente indisponível. Reenvie com o mesmo conteúdo |

Erros de serializers seguem os campos DRF. Erros de regra do evento usam `error.code` e `error.message`. O contrato legado com `X-Camera-ID` e `X-Camera-Key` mantém `meal_service`, respostas `{id,created}` e validações anteriores para câmera sem agente.

Exemplo de lote com um evento confirmado e um rejeitado.

```json
{
  "events": [
    {"event_id":"entrada-001","camera_id":"1d2c7ed6-768a-4f35-9471-3b2e7bf61c06","event_type":"STUDENT_ENTRY","recorded_at":"2026-11-18T07:00:00-03:00","quantity":5},
    {"event_id":"entrada-002","camera_id":"1d2c7ed6-768a-4f35-9471-3b2e7bf61c06","event_type":"STUDENT_ENTRY","recorded_at":"2026-11-18T07:01:00-03:00","quantity":0}
  ]
}
```

```json
{
  "status": "partial",
  "accepted": 1,
  "rejected": 1,
  "results": [
    {"index":0,"http_status":201,"event_id":"entrada-001","status":"created","processed":true,"duplicate":false,"id":"edee6278-346f-4153-8170-3779117ae7cf"},
    {"index":1,"http_status":400,"event_id":"entrada-002","error":{"code":"INVALID_EVENT","message":"Revise o evento.","fields":{"quantity":["Certifique-se de que este valor seja maior ou igual a 1."]}}}
  ]
}
```

## Consulta pelo aplicativo

Use JWT em `Authorization: Bearer <access>` e `X-Organization-ID`.

| Rota GET | Resposta |
|---|---|
| `/api/v1/student-counts/` e `/api/v1/plate-counts/` | Registros originais em ordem decrescente de ocorrência, com `recorded_at` e `received_at`, paginados |
| `/api/v1/student-counts/summary/` e `/api/v1/plate-counts/summary/` | Agregado com `automatic`, `legacy_manual`, `adjustment`, `total` e `last_updated`. A chave específica é `student_entries` ou `served_plates` |
| `/api/v1/cameras/{id}/count-activity/` | Processados, duplicados, rejeições de regra e horários de atividade no escopo técnico da câmera |

Filtros de contagem são `school`, `camera`, `date`, `start_at`, `end_at` e, para pratos, `meal_service`. A data usa o fuso Django. Os limites com offset são inclusivos e podem restringir a data. Resumos usam a data local corrente por padrão. Sem data explícita, preencha ambos os limites para consultar um intervalo. A ausência de `school` agrega as escolas autorizadas e retorna `school_id:null`.
