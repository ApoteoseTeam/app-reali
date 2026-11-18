# Reali — API REST para React Native (Android e iOS)

## Base
`/api/v1/` ; corpo JSON, datas ISO-8601 com fuso; IDs de domínio em UUID. O ID do usuário é numérico. Rotas autenticadas exigem `Authorization: Bearer <access_token>`. Rotas de dados multi-organização exigem `X-Organization-ID: <uuid>`.

**Autenticação e onboarding**
| Método | Rota | Permissão | Objetivo |
|---|---|---|---|
| POST | institution-requests/ | Pública | Solicitação inicial via site |
| POST | auth/login/ | Pública | JWT e-mail/senha |
| POST | auth/refresh/ | Pública com refresh válido | Renovar token |
| POST | auth/logout/ | Refresh válido | Revogar o refresh enviado no corpo |
| GET | auth/me/ | Autenticado | Identidade e organizações |
| POST | auth/activate/ | Pública com token | Definir senha no convite novo |
| GET/POST | invitations/ | ADMIN | Listar/emitir convites |
| GET | memberships/ | ADMIN/MANAGER | Listar equipe |

**Organizações, escolas e câmeras**
| Método | Rota | Permissão | Objetivo |
|---|---|---|---|
| GET | organizations/ | Autenticado | Organizações do usuário |
| GET/POST | schools/ | Membro / ADMIN grava | Escolas |
| GET/PUT/PATCH | schools/{id}/ | Membro / ADMIN grava | Escola |
| GET/POST | cameras/ | Membro / ADMIN grava | Câmeras |
| GET/PUT/PATCH | cameras/{id}/ | Membro / ADMIN grava | Estado cadastral da câmera |

**Refeições, contagens e relatórios**
| Método | Rota | Permissão | Objetivo |
|---|---|---|---|
| GET/POST | meal-services/ | Membro / ADMIN ou MANAGER grava | Serviços |
| GET/PUT/PATCH | meal-services/{id}/ | Membro / ADMIN ou MANAGER grava | Serviço planejado |
| POST | meal-services/{id}/start/ | Membro autorizado | Congelar entradas e estimar pratos |
| POST | meal-services/{id}/start-serving/ | Membro autorizado | Iniciar distribuição |
| POST | meal-services/{id}/finish/ | Membro autorizado | Finalizar |
| GET | meal-services/{id}/forecast/ | Membro | Previsão |
| GET | student-counts/?school={id} | Membro | Entradas |
| GET | plate-counts/?meal_service={id} | Membro | Pratos |
| GET | analytics/daily/?school={id} | Membro | Indicadores consolidados |
| POST | analytics/rebuild/ | ADMIN/MANAGER | Recalcular indicador de escola/dia |

**Dispositivo (não usar token JWT de pessoa)**
| Método | Rota | Autenticação | Objetivo |
|---|---|---|---|
| POST | device/heartbeat/ | `X-Camera-ID` + `X-Camera-Key` | Sinal de vida |
| POST | device/counts/ | `X-Camera-ID` + `X-Camera-Key` | Evento de contagem idempotente |

### Exemplos

`POST /api/v1/invitations/` (ADMIN)
```json
{"email":"merendeira@escola.com.br","role":"COOK"}
```

`POST /api/v1/auth/activate/`
```json
{"token":"TOKEN_DO_EMAIL","full_name":"Ana Silva","password":"SenhaForteEscolhidaPelaPessoa"}
```

`POST /api/v1/meal-services/{id}/start/`
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
- Login recebe `email` e `password`. Refresh recebe `refresh` e devolve um novo par. Salve o novo refresh, pois o anterior entra na lista de revogação. Logout recebe `refresh` e revoga esse token. Access tokens já emitidos expiram em até 15 minutos.
- Membros ativos leem as escolas da organização selecionada. Administradores cadastram escolas e câmeras. Administradores, gestores e merendeiras executam as transições de preparo e distribuição.
- Atualizações da escola ou do tipo de uma câmera com histórico retornam `400`. O estado ativo e os demais campos cadastrais continuam editáveis.
- Eventos são incrementos inteiros entre 1 e 100.000. Envie o mesmo `event_id`, quantidade, instante e serviço em reenvios. A primeira gravação retorna `201`; um reenvio igual retorna `200` com o mesmo ID, inclusive após a finalização. Alterar o conteúdo de um ID existente retorna `400`.
- Para uma primeira gravação da cantina, informe o serviço da escola em distribuição. Um evento que chega pela primeira vez após o encerramento ainda requer uma política de tratamento. Envie `recorded_at` com offset e use o heartbeat para atualizar `last_seen_at`.
- A previsão congela as entradas da data local do serviço registradas até o início do preparo. A razão padrão é `1.000`. A consolidação diária pode ser recalculada por administradores e gestores. Entradas não medem presença individual, e a diferença entre previsto e servido não mede desperdício.
- Swagger e schema ficam disponíveis em desenvolvimento em `/api/docs/` e `/api/schema/`. Consulte o [relatório](docs/AUDIT_REPORT.md) para pendências de onboarding e integração.
