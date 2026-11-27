# Reali — API REST para React Native (Android e iOS)

## Base
`/api/v1/` ; corpo JSON, datas ISO-8601 com fuso; IDs de domínio em UUID. O ID do usuário é numérico. Rotas autenticadas exigem `Authorization: Bearer <access_token>`. Rotas de dados multi-organização exigem `X-Organization-ID: <uuid>`.

Consulte o [contrato de autenticação e acesso](docs/API_AUTH_ENDPOINTS.md) para login, recuperação, solicitações, convites e funcionários.

**Organizações, escolas e câmeras**

O [contrato de câmeras e agentes](docs/CAMERA_API_ENDPOINTS.md) detalha status, configuração, histórico e provisionamento.
| Método | Rota | Permissão | Objetivo |
|---|---|---|---|
| GET | organizations/ | Autenticado | Organizações do usuário |
| GET/POST | schools/ | Membro autorizado / gestor grava | Escolas |
| GET/PUT/PATCH | schools/{id}/ | Membro autorizado / gestor grava | Escola |
| GET/POST | cameras/ | Membro autorizado / gestor grava | Câmeras |
| GET/PUT/PATCH | cameras/{id}/ | Membro autorizado / gestor grava | Estado cadastral da câmera |

**Refeições, contagens e relatórios**

O [contrato de planejamento](docs/FORECAST_API.md) detalha programações, políticas, snapshots, previsões e transições.
| Método | Rota | Permissão | Objetivo |
|---|---|---|---|
| GET/POST | meal-services/ | Papel autorizado / gestor grava | Serviços |
| GET/PUT/PATCH | meal-services/{id}/ | Papel autorizado / gestor grava | Serviço planejado |
| POST | meal-services/{id}/start/ | Membro autorizado | Congelar entradas e estimar pratos |
| POST | meal-services/{id}/start-serving/ | Membro autorizado | Iniciar distribuição |
| POST | meal-services/{id}/finish/ | Membro autorizado | Finalizar |
| GET | meal-services/{id}/forecast/ | Papel autorizado | Previsão |
| GET | student-counts/?school={id} | Papel autorizado | Entradas |
| GET | plate-counts/?meal_service={id} | Papel autorizado | Pratos |
| GET | analytics/daily/?school={id} | Papel autorizado | Indicadores consolidados |
| POST | analytics/rebuild/ | Gestor | Recalcular indicador de escola/dia |

**Dispositivo (não usar token JWT de pessoa)**
| Método | Rota | Autenticação | Objetivo |
|---|---|---|---|
| POST | device/heartbeat/ | `Authorization: Device <token>` ou contrato legado | Telemetria por agente |
| GET | device/configuration/ | `Authorization: Device <token>` | Câmeras atribuídas e configuração |
| POST | device/counts/ | `Authorization: Device <token>` ou contrato legado | Evento idempotente |
| POST | device/counts/batch/ | `Authorization: Device <token>` | Resultado por evento |

Veja o [contrato de eventos, lotes, filtros e resumos](docs/DEVICE_COUNT_API.md) e as [correções auditadas](docs/COUNT_ADJUSTMENTS.md).

### Exemplos legados e planejamento

`POST /api/v1/meal-services/{id}/start/` com taxa explícita de gestor
```json
{"estimated_plates_per_entry":"0.930"}
```

`POST /api/v1/device/counts/` (portaria)
```json
{"event_id":"portaria-124","recorded_at":"2026-11-18T07:30:00-03:00","quantity":8}
```

`POST /api/v1/device/counts/` (cantina)
```json
{"event_id":"cantina-124","recorded_at":"2026-11-18T12:10:00-03:00","quantity":6,"meal_service":"UUID_DO_SERVICO"}
```

## Respostas e regras operacionais

- As listas de organizações, escolas, câmeras, serviços, equipe, contagens e métricas têm páginas de 50 itens e retornam `count`, `next`, `previous` e `results`. A lista de convites retorna até 100 itens como array.
- O DRF retorna erros de validação como campos ou `detail`. Use `401` para sessão JWT inválida, `403` para falta de vínculo/permissão ou credencial de câmera inválida, `404` para recursos fora do escopo e `429` para limites de requisição.
- Login recebe `email` e `password`. Refresh recebe `refresh` e devolve um novo par. Salve o novo refresh, pois o anterior entra na lista de revogação. Logout recebe `refresh` e revoga os tokens e inscrições de dispositivo vinculados à mesma sessão. Access tokens anteriores ao identificador de sessão têm validade residual de até 15 minutos.
- Vínculos ativos veem as escolas concedidas. O gestor configura escolas e câmeras. Gestor e cozinha podem executar as transições de preparo e distribuição. Consulte a [matriz de permissões](docs/PERMISSIONS.md).
- Atualizações da escola ou do tipo de uma câmera com histórico retornam `400`. O estado ativo e os demais campos cadastrais continuam editáveis.
- No contrato legado de contagens, eventos são incrementos inteiros entre 1 e 100.000. Envie o mesmo `event_id`, quantidade, instante e serviço em reenvios. A primeira gravação retorna `201`; um reenvio igual retorna `200` com o mesmo ID, inclusive após a finalização. Alterar o conteúdo de um ID existente retorna `400`.
- Para uma primeira gravação da cantina pelo contrato legado, informe o serviço da escola em distribuição. Com token de agente, eventos tardios podem ser recebidos após o encerramento se ocorreram durante a distribuição e ainda estão na janela configurada. Envie `recorded_at` com offset e use o heartbeat para atualizar `last_seen_at`.
- O preparo congela as entradas da escola dentro da janela configurada e disponíveis até o corte. O motor usa histórico comparável ou uma taxa inicial explícita. Sem dados suficientes, a previsão pode retornar `null`. A consolidação diária pode ser recalculada por gestores. Entradas não medem presença individual, e a diferença entre previsto e servido não mede desperdício.
- Swagger e schema ficam disponíveis em desenvolvimento em `/api/docs/` e `/api/schema/`. Consulte o [relatório da Fase 2](docs/PHASE2_REPORT.md) para os resultados e as pendências de integração.

### Indicadores e relatórios

Consulte [API de relatórios](docs/REPORTING_API.md), [histórico](docs/HISTORY_API.md) e [permissões analíticas](docs/ANALYTICS_PERMISSIONS.md). O recálculo usa `POST /api/v1/analytics/daily/rebuild/`, com o alias legado `POST /api/v1/analytics/rebuild/`.

### RealInova

A rota `POST ai/chat/` e as rotas `ai/conversations/`, `ai/conversations/{id}/messages/` e `ai/usage/` usam a sessão JWT e o cabeçalho institucional existentes. Consulte [contratos e erros](docs/REALINOVA_API.md).

### Sessão do aplicativo mobile

`GET /api/v1/auth/me/` também retorna `memberships[].capabilities`, com as capacidades de navegação calculadas a partir do vínculo do usuário. `PATCH /api/v1/auth/me/` aceita `full_name` e devolve o perfil autenticado. O e-mail usa o fluxo de identidade existente. [Integração do aplicativo](../frontend/docs/MOBILE_AUTHENTICATION.md)

### Notificações, ajustes e auditoria

A central em `/api/v1/notifications/` oferece lista, contador, leitura, arquivo e preferências no contexto institucional, além de registro e revogação de dispositivos na sessão autenticada. O logout revoga as inscrições push dessa sessão. Os ajustes ganham detalhe, estado, ID de auditoria e suporte a `Idempotency-Key`. A auditoria do gestor e a de operadores da plataforma têm rotas próprias de consulta. [Notificações](docs/NOTIFICATIONS_API.md) · [Correções](docs/COUNT_ADJUSTMENTS.md) · [Auditoria](docs/ADMIN_AUDIT.md)
