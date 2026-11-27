# Correções de contagem

Os endpoints `GET/POST /api/v1/count-adjustments/`, `GET /api/v1/count-adjustments/{id}/` e `POST /api/v1/count-adjustments/{id}/reverse/` usam JWT e `X-Organization-ID`. O gestor só opera nas escolas autorizadas. O registro de correção contém ator, data de criação, escola, câmera, tipo, registro de origem, serviço se aplicável, delta, justificativa e ID de auditoria.

Para corrigir uma contagem existente, envie o tipo e a referência. Escola, câmera, horário e serviço são herdados do original.

```json
{"event_type":"STUDENT_ENTRY","count_id":"4306083c-67a7-46ae-9a12-5e6a4ea7291c","delta":-2,"reason":"Contagem conferida na portaria"}
```

Uma passagem ausente pode ser corrigida com delta positivo, `camera_id` e `recorded_at` no passado. Para pratos sem evento original, envie também `meal_service_id` de um serviço em distribuição ou finalizado na escola e na data informada.

Para reverter, envie `{"reason":"Motivo da reversão"}`. O backend acrescenta um delta inverso com referência ao ajuste anterior. Cada ajuste admite uma reversão. Se remover um delta positivo tornaria o original ajustado negativo, a reversão é rejeitada. O campo `state` distingue `APPLIED`, `REVERSED` e `REVERSAL`.

Envie um `Idempotency-Key` UUID por operação. O mesmo usuário e organização recebem a correção original em uma repetição idêntica, e HTTP 409 se reutilizarem a chave com outra entrada. Clientes antigos continuam aceitos. O app usa a mesma chave ao repetir a mesma submissão após erro de rede. O serviço bloqueia correções concorrentes no escopo e valida que o total efetivo permaneça não negativo.

A correção, a auditoria, a sinalização de recálculo e o aviso são atômicos. As somas consolidadas consideram as correções e reversões. A reconstrução explícita usa os valores atuais e preserva os snapshots históricos. O registro automático de origem e os deltas anteriores permanecem visíveis.
