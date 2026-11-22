# Idempotência, ordem e atrasos

Cada câmera tem seu próprio espaço de IDs. O hash considera tipo, instante UTC com microssegundos, incremento e UUID do serviço. Dois offsets que representam o mesmo instante produzem a mesma confirmação. O mesmo ID pode ser usado em outra câmera. O registro central evita reutilização entre tipos na mesma câmera.

A transação bloqueia o agente e as câmeras envolvidas em ordem estável, revalida a credencial e resolve os serviços da escola. As contagens, chaves de idempotência e estatísticas são gravadas juntas. Restrições únicas no PostgreSQL protegem o resultado concorrente. Reenvio igual conserva a referência original, inclusive depois do fechamento ou da mudança de credencial. Os limites temporais são aplicados somente a eventos novos. O agente e a câmera ainda precisam estar autorizados.

Para pratos, um serviço `SERVING` exige `serving_started_at`. Um serviço `FINISHED` exige também `finished_at`. O horário original deve cair na janela inclusiva da distribuição. O recebimento tardio respeita a janela geral de atraso e pode ocorrer após o fechamento. O serviço indicado é sempre o que se valida. A API aceita eventos fora de ordem dentro dos limites.

| Variável | Padrão |
|---|---|
| `COUNT_MAX_DELAY_SECONDS` | `86400` |
| `COUNT_MAX_FUTURE_SECONDS` | `300` |
| `COUNT_BATCH_LIMIT` | `100`, máximo configurável de 500 |
| `COUNT_MAX_BODY_BYTES` | `131072` |
| `DEVICE_COUNT_RATE` | `120/min`, compartilhado entre envio unitário e em lote por identidade |

O registro de idempotência acompanha o tempo de vida da contagem. O monitoramento mantém uma linha por câmera. `last_received_at` identifica a última confirmação de um evento novo e `last_attempt_at` inclui tentativas identificadas no escopo. Rejeições de formato ou escopo são registradas em logs agregados sem gravar os payloads. Falhas de autenticação seguem a política da Fase 3. A disponibilidade da câmera continua sendo determinada pelo heartbeat.
