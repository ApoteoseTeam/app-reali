# Ajustes manuais de contagem

Direção e gestão podem listar e criar ajustes em `/api/v1/count-adjustments/` e reverter em `POST /api/v1/count-adjustments/{id}/reverse/`. Use JWT e `X-Organization-ID`. O vínculo e as escolas concedidas são verificados. O motivo é obrigatório e o serviço grava ator, horário e auditoria.

Para ajustar uma contagem existente, envie o tipo e a referência. Escola, câmera, horário e serviço são herdados do original.

```json
{"event_type":"STUDENT_ENTRY","count_id":"4306083c-67a7-46ae-9a12-5e6a4ea7291c","delta":-2,"reason":"Contagem conferida na portaria"}
```

O valor do original somado a todos os seus deltas deve permanecer maior ou igual a zero, inclusive sob concorrência. Uma passagem ausente pode ser corrigida com delta positivo, `camera_id` e `recorded_at` no passado. Para pratos sem evento original, também envie `meal_service_id` de um serviço em distribuição ou finalizado da escola e da data informada.

Para reverter, envie `{"reason":"Motivo da reversão"}`. O backend acrescenta um delta inverso com referência ao ajuste anterior. Cada ajuste admite uma reversão. Se remover um delta positivo tornaria o original ajustado negativo, a reversão é rejeitada. Os eventos originais e os deltas anteriores permanecem visíveis. A reconstrução explícita de indicadores usa os valores atuais e preserva snapshots históricos.
