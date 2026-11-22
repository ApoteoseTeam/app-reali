# Relatório da Fase 4

O backend recebe incrementos de entradas e pratos, grava contagens e confirmação na mesma transação e valida câmera, agente e escola. A ingestão unitária mantém a rota existente e acrescenta o contrato por token de agente. Os lotes retornam um resultado por item. Direção e gestão podem corrigir e reverter contagens por deltas auditados.

## Alterações

- `counting.0003_cameracountactivity_countadjustment_and_more` adiciona `DeviceIngestionEvent`, `CameraCountActivity` e `CountAdjustment`, e preenche o registro central com IDs históricos.
- `apps/counting/ingestion.py` centraliza transação, validação da janela de distribuição, deduplicação e atividade. `queries.py` agrega valores brutos e deltas. `adjustments.py` valida, preserva a contagem original e registra auditoria.
- `apps/counting/views.py` e `serializers.py` implementam ingestão unitária, lote, listagens, resumos e ajustes. As rotas existentes usam o novo serviço. O módulo de câmeras fornece `count-activity`. O planejamento e a reconstrução de indicadores reutilizam a agregação.
- A equipe de visão pode usar os [exemplos HTTP e JSON](DEVICE_COUNT_API.md), o [guia de integração](VISION_INTEGRATION.md) e a [política de autorização](COUNTING_SECURITY.md).

## Evidências e aceite

| Estado | Verificação | Evidência |
|---|---|---|
| Validado | Ingestão e lotes | Portaria e cantina por token de agente. Validação por câmera, serviço e escola. Resultado parcial e reenvio com a mesma confirmação. |
| Validado | Idempotência e falhas | Commit central por câmera/ID, conflito, payload tardio, janela real do serviço, concorrência e rollback de armazenamento. Snapshots históricos preservados. |
| Validado | Operações de funcionários | Consultas por escopo, filtros, resumos, ajustes auditados, proteção contra total negativo e reversão por novo registro. |
| Validado | PostgreSQL 18 | 45 testes funcionais aprovados. A carga opcional foi executada em separado. |
| Validado | SQLite | 39 testes aprovados e seis testes de locks reservados ao PostgreSQL. A carga opcional depende de PostgreSQL. |
| Validado | Carga HTTP | 180 requisições de seis emissores simulados. 504 contagens gravadas, 36 reenvios reconhecidos e zero erros. Veja [métricas e reprodução](COUNTING_TESTS.md). |
| Validado | Migração e contrato | Plano revisado, migration aplicada em cópia isolada da Fase 3, replay histórico após a troca de credencial e plano posterior vazio. Django check, verificação de migrations, OpenAPI e Ruff passaram. |
| Validado com ressalva | Check de implantação | Apenas `security.W004`, referente ao HSTS. |
| Não verificado | Integração externa | Software existente, câmeras, HTTPS e cache compartilhado de homologação. A origem do UUID de serviço para a cantina precisa ser combinada na operação da integração. |
| Não verificado | Postman CLI | O CLI instalado não oferece `postman status`. Os testes funcionais e de carga foram executados localmente. |

Foram usadas bases isoladas para migrações e testes. O guia de [idempotência](EVENT_IDEMPOTENCY.md) documenta limites, janelas e tratamento de reenvios. Antes da integração real, alinhe a entrega do UUID do serviço de merenda ao agente e valide o fluxo em homologação com o software existente.
