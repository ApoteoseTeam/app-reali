# Integração do software de visão com o Reali

Use o software existente para guardar cada evento na fila local antes de transmitir. Gere um ID estável por câmera, grave o horário original com fuso e envie um incremento positivo. Uma detecção de 8 seguida de 5 produz dois eventos e um total de 13. As contagens de entrada medem passagens observadas, e as de pratos medem entregas observadas.

1. Obtenha o token provisionado do agente e guarde-o no armazenamento protegido do computador.
2. Consulte `GET /api/v1/device/configuration/` para identificar as câmeras atribuídas. A configuração `STUDENT_ENTRY` produz eventos `STUDENT_ENTRY`. A configuração `PLATE_DELIVERY` produz eventos `PLATE_SERVED`. Use o serviço de merenda informado pela operação da escola para pratos. A API valida esse identificador e a janela real de distribuição.
3. Envie eventos por HTTPS ao [endpoint unitário ou em lote](DEVICE_COUNT_API.md). Continue enviando heartbeats para disponibilidade mesmo quando não há contagens.
4. Remova da fila local eventos confirmados como `created` ou `already_processed`. Em lote, faça isso item por item. Mantenha timestamps e IDs nas novas tentativas.

- `400`, `403` e `404` exigem correção do conteúdo, horário ou provisionamento indicado. Evite reenvio cego.
- `401` exige interromper o envio e recuperar a credencial. `429` exige respeitar `Retry-After`, quando presente.
- Em erro de rede, `500` ou `503`, preserve os eventos pendentes e use espera exponencial com jitter. A falta de resposta pode ocultar uma confirmação já gravada.
- Em `EVENT_CONFLICT`, preserve os dados para investigação. O reaproveitamento de ID com conteúdo diferente pode indicar reinício incorreto do emissor.
- Quando uma câmera legada for associada a um agente, passe ao novo cabeçalho e payload. IDs já confirmados são reconhecidos após a troca de credencial.

A API recebe JSON dos eventos produzidos pela visão. Captura, deduplicação visual e gerenciamento da fila pertencem ao software independente.
