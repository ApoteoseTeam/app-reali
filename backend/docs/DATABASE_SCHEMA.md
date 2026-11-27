# Relatório do esquema do banco de dados

O banco SQLite local do Reali contém **50 tabelas** e **455 colunas**. O inventário inclui as tabelas de associação, as tabelas do Django e a tabela interna `sqlite_sequence`.

Fonte do inventário físico: `backend/db.sqlite3`. O histórico local contém 54 migrações aplicadas, das quais 24 correspondem aos arquivos de migração dos aplicativos em `backend/apps`.

Os tipos declarados e valores padrão são os do SQLite. O esquema de instâncias PostgreSQL não foi consultado.

## Tabelas por área

| Área | Tabelas |
| --- | ---: |
| [Assistente de IA](#assistente-de-ia) | 3 |
| [Indicadores diários](#indicadores-diários) | 2 |
| [API e auditoria](#api-e-auditoria) | 6 |
| [Grupos e permissões](#grupos-e-permissões) | 3 |
| [Câmeras e dispositivos](#câmeras-e-dispositivos) | 5 |
| [Contagens](#contagens) | 5 |
| [Infraestrutura do Django](#infraestrutura-do-django) | 4 |
| [Organizações e escolas](#organizações-e-escolas) | 2 |
| [Refeições e previsões](#refeições-e-previsões) | 5 |
| [Notificações e alertas](#notificações-e-alertas) | 7 |
| [Controle interno do SQLite](#controle-interno-do-sqlite) | 1 |
| [Tokens JWT](#tokens-jwt) | 2 |
| [Usuários e vínculos](#usuários-e-vínculos) | 5 |

## Dicionário de dados

**PK** indica chave primária e **FK** indica chave estrangeira. **Padrão SQL** é o valor padrão definido no banco. O símbolo **—** indica que a informação está ausente ou não se aplica.

### Assistente de IA

#### `ai_aiconversation`

**Finalidade.** Organiza o histórico de conversas de um usuário com o assistente de IA, no contexto de uma organização e, quando aplicável, de uma escola.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `access_role` | `varchar(20)` | Não | — | — |
| `scope_key` | `varchar(64)` | Não | — | — |
| `title` | `varchar(120)` | Não | — | — |
| `status` | `varchar(8)` | Não | — | — |
| `last_message_at` | `datetime` | Sim | — | — |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `school_id` | `char(32)` | Sim | — | FK → `institutions_school.id` |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |

#### `ai_aiexecution`

**Finalidade.** Registra o processamento de uma solicitação ao assistente, incluindo status, modelos tentados, ferramentas usadas, consumo de tokens, custo e erros.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `client_request_id` | `char(32)` | Sim | — | — |
| `request_signature` | `varchar(64)` | Não | — | — |
| `usage_day` | `date` | Não | — | — |
| `status` | `varchar(9)` | Não | — | — |
| `attempted_models` | `TEXT` | Não | — | — |
| `tools` | `TEXT` | Não | — | — |
| `http_calls` | `integer unsigned` | Não | — | — |
| `input_tokens` | `integer unsigned` | Sim | — | — |
| `output_tokens` | `integer unsigned` | Sim | — | — |
| `token_usage_complete` | `bool` | Sim | — | — |
| `reserved_microusd` | `bigint unsigned` | Não | — | — |
| `charged_microusd` | `bigint unsigned` | Não | — | — |
| `latency_ms` | `integer unsigned` | Sim | — | — |
| `error_code` | `varchar(40)` | Não | — | — |
| `completed_at` | `datetime` | Sim | — | — |
| `conversation_id` | `char(32)` | Sim | — | FK → `ai_aiconversation.id` |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "ai_conversation_pending" ON "ai_aiexecution" ("conversation_id") WHERE ("conversation_id" IS NOT NULL AND "status" = 'PENDING')`
- `CREATE UNIQUE INDEX "ai_execution_idempotency" ON "ai_aiexecution" ("user_id", "organization_id", "client_request_id") WHERE "client_request_id" IS NOT NULL`

#### `ai_aimessage`

**Finalidade.** Armazena as mensagens de uma conversa com o assistente, incluindo conteúdo, papel do autor, status e fontes, quando disponíveis.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `role` | `varchar(9)` | Não | — | — |
| `content` | `TEXT` | Não | — | — |
| `status` | `varchar(9)` | Não | — | — |
| `sources` | `TEXT` | Não | — | — |
| `error_code` | `varchar(40)` | Não | — | — |
| `completed_at` | `datetime` | Sim | — | — |
| `conversation_id` | `char(32)` | Não | — | FK → `ai_aiconversation.id` |
| `execution_id` | `char(32)` | Sim | — | FK → `ai_aiexecution.id` |

**Restrições de unicidade**

- `execution_id` + `role`

### Indicadores diários

#### `analytics_dailymetrics`

**Finalidade.** Consolida por escola e data os totais de entradas, pratos previstos e servidos, além dos indicadores de qualidade e erro da previsão.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `reference_date` | `date` | Não | — | — |
| `total_student_entries` | `integer unsigned` | Não | — | — |
| `total_forecast_plates` | `integer unsigned` | Não | — | — |
| `total_served_plates` | `integer unsigned` | Não | — | — |
| `calculated_at` | `datetime` | Sim | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |
| `compared_served` | `bigint unsigned` | Não | — | — |
| `compared_services` | `integer unsigned` | Não | — | — |
| `data_status` | `varchar(12)` | Não | — | — |
| `eligible_services` | `integer unsigned` | Não | — | — |
| `has_entries` | `bool` | Sim | — | — |
| `has_forecast` | `bool` | Sim | — | — |
| `has_served` | `bool` | Sim | — | — |
| `is_complete` | `bool` | Não | — | — |
| `sum_absolute_error` | `bigint unsigned` | Não | — | — |

**Restrições de unicidade**

- `school_id` + `reference_date`

#### `analytics_pendingdailymetrics`

**Finalidade.** Mantém a fila de combinações de escola e data cujos indicadores diários precisam ser recalculados.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `reference_date` | `date` | Não | — | — |
| `queued_at` | `datetime` | Não | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |
| `first_queued_at` | `datetime` | Não | `STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')` | — |

**Restrições de unicidade**

- `school_id` + `reference_date`

### API e auditoria

#### `api_auditlog`

**Finalidade.** Registra ações auditadas no sistema, com o autor, o objeto afetado, o contexto institucional e o identificador da requisição, quando disponíveis.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `action` | `varchar(50)` | Não | — | — |
| `object_id` | `varchar(64)` | Não | — | — |
| `details` | `TEXT` | Não | — | — |
| `actor_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `organization_id` | `char(32)` | Sim | — | FK → `institutions_organization.id` |
| `request_id` | `char(32)` | Sim | — | — |
| `school_id` | `char(32)` | Sim | — | FK → `institutions_school.id` |
| `target_type` | `varchar(64)` | Não | — | — |

#### `api_cameracredential`

**Finalidade.** Armazena o hash e a revogação da credencial legada de autenticação de uma câmera na API.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `secret_hash` | `varchar(64)` | Não | — | — |
| `revoked_at` | `datetime` | Sim | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |

**Restrições de unicidade**

- `camera_id`

#### `api_institutionrequest`

**Finalidade.** Acompanha pedidos de cadastro de instituições, desde o recebimento dos dados de contato até a aprovação ou rejeição.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `organization_name` | `varchar(160)` | Não | — | — |
| `contact_name` | `varchar(160)` | Não | — | — |
| `contact_email` | `varchar(254)` | Não | — | — |
| `phone` | `varchar(30)` | Não | — | — |
| `message` | `TEXT` | Não | — | — |
| `status` | `varchar(12)` | Não | — | — |
| `initial_invitation_id` | `char(32)` | Sim | — | FK → `api_userinvitation.id` |
| `organization_id` | `char(32)` | Sim | — | FK → `institutions_organization.id` |
| `rejection_reason` | `TEXT` | Não | — | — |
| `reviewed_at` | `datetime` | Sim | — | — |
| `reviewed_by_id` | `bigint` | Sim | — | FK → `users_user.id` |

**Restrições de unicidade**

- `initial_invitation_id`
- `organization_id`

#### `api_passwordresetmail`

**Finalidade.** Mantém os envios pendentes de e-mails de redefinição de senha e controla as tentativas de envio.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `session_version` | `integer unsigned` | Não | — | — |
| `attempts` | `smallint unsigned` | Não | — | — |
| `available_at` | `datetime` | Não | — | — |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |

**Restrições de unicidade**

- `user_id`

#### `api_userinvitation`

**Finalidade.** Controla convites para entrar em uma organização, incluindo o papel oferecido, o prazo, o envio, a aceitação e a revogação.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `email` | `varchar(254)` | Não | — | — |
| `role` | `varchar(20)` | Não | — | — |
| `token_hash` | `varchar(64)` | Não | — | — |
| `expires_at` | `datetime` | Não | — | — |
| `accepted_at` | `datetime` | Sim | — | — |
| `status` | `varchar(12)` | Não | — | — |
| `invited_by_id` | `bigint` | Não | — | FK → `users_user.id` |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `all_schools_access` | `bool` | Não | — | — |
| `delivery_status` | `varchar(10)` | Não | — | — |
| `last_sent_at` | `datetime` | Sim | — | — |
| `revoked_at` | `datetime` | Sim | — | — |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "uq_pending_invitation_org_email" ON "api_userinvitation" ("organization_id", "email") WHERE "status" = 'PENDING'`
- `token_hash`

#### `api_userinvitation_schools`

**Finalidade.** Vincula um convite às escolas específicas que o usuário poderá acessar ao aceitá-lo.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `userinvitation_id` | `char(32)` | Não | — | FK → `api_userinvitation.id` |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |

**Restrições de unicidade**

- `userinvitation_id` + `school_id`

### Grupos e permissões

#### `auth_group`

**Finalidade.** Cadastra os grupos de usuários do sistema de permissões do Django.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `name` | `varchar(150)` | Não | — | — |

**Restrições de unicidade**

- `name`

#### `auth_group_permissions`

**Finalidade.** Define as permissões do Django concedidas aos membros de cada grupo.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `group_id` | `INTEGER` | Não | — | FK → `auth_group.id` |
| `permission_id` | `INTEGER` | Não | — | FK → `auth_permission.id` |

**Restrições de unicidade**

- `group_id` + `permission_id`

#### `auth_permission`

**Finalidade.** Cadastra as permissões do Django que podem ser atribuídas a grupos ou diretamente a usuários.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `content_type_id` | `INTEGER` | Não | — | FK → `django_content_type.id` |
| `codename` | `varchar(100)` | Não | — | — |
| `name` | `varchar(255)` | Não | — | — |

**Restrições de unicidade**

- `content_type_id` + `codename`

### Câmeras e dispositivos

#### `cameras_camera`

**Finalidade.** Cadastra as câmeras de cada escola e mantém seu estado operacional mais recente, com dados de vídeo, detecção e telemetria.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `name` | `varchar(150)` | Não | — | — |
| `camera_type` | `varchar(12)` | Não | — | — |
| `location` | `varchar(120)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `last_seen_at` | `datetime` | Sim | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |
| `detector_status` | `varchar(10)` | Não | — | — |
| `health_status` | `varchar(10)` | Não | — | — |
| `pending_events` | `integer unsigned` | Sim | — | — |
| `processing_fps` | `REAL` | Sim | — | — |
| `telemetry_reason` | `varchar(30)` | Não | — | — |
| `video_status` | `varchar(12)` | Não | — | — |
| `edge_device_id` | `char(32)` | Sim | — | FK → `cameras_edgedevice.id` |

#### `cameras_cameraconfiguration`

**Finalidade.** Armazena versões dos parâmetros de configuração de cada câmera.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `version` | `integer unsigned` | Não | — | — |
| `parameters` | `TEXT` | Não | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |

**Restrições de unicidade**

- `camera_id`

#### `cameras_camerahealthevent`

**Finalidade.** Mantém o histórico de eventos de saúde da câmera, incluindo mudanças de estado e quando ocorreram.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `event_type` | `varchar(30)` | Não | — | — |
| `previous_status` | `varchar(10)` | Não | — | — |
| `new_status` | `varchar(10)` | Não | — | — |
| `message` | `varchar(200)` | Não | — | — |
| `occurred_at` | `datetime` | Não | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |

#### `cameras_devicecredential`

**Finalidade.** Controla as credenciais de autenticação dos dispositivos de borda, com hash do token, validade, revogação e último uso.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `token_prefix` | `varchar(24)` | Não | — | — |
| `token_hash` | `varchar(64)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `expires_at` | `datetime` | Sim | — | — |
| `revoked_at` | `datetime` | Sim | — | — |
| `last_used_at` | `datetime` | Sim | — | — |
| `edge_device_id` | `char(32)` | Não | — | FK → `cameras_edgedevice.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "one_active_device_credential" ON "cameras_devicecredential" ("edge_device_id") WHERE "is_active"`
- `token_prefix`

#### `cameras_edgedevice`

**Finalidade.** Cadastra os dispositivos de borda instalados nas escolas e mantém a versão do agente e os horários de atividade observada.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `name` | `varchar(150)` | Não | — | — |
| `device_identifier` | `char(32)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `last_seen_at` | `datetime` | Sim | — | — |
| `last_observed_at` | `datetime` | Sim | — | — |
| `agent_version` | `varchar(50)` | Não | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |

**Restrições de unicidade**

- `device_identifier`

### Contagens

#### `counting_cameracountactivity`

**Finalidade.** Resume por câmera o volume de eventos de contagem processados, duplicados e rejeitados, com os horários mais recentes.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `processed` | `bigint unsigned` | Não | — | — |
| `duplicates` | `bigint unsigned` | Não | — | — |
| `rejected` | `bigint unsigned` | Não | — | — |
| `last_received_at` | `datetime` | Sim | — | — |
| `last_recorded_at` | `datetime` | Sim | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |

**Restrições de unicidade**

- `camera_id`

#### `counting_countadjustment`

**Finalidade.** Registra correções nas contagens de entradas ou pratos, com o valor do ajuste, o motivo, o responsável e o vínculo com eventual estorno.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `event_type` | `varchar(13)` | Não | — | — |
| `delta` | `INTEGER` | Não | — | — |
| `reason` | `varchar(500)` | Não | — | — |
| `recorded_at` | `datetime` | Não | — | — |
| `actor_id` | `bigint` | Não | — | FK → `users_user.id` |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |
| `meal_service_id` | `char(32)` | Sim | — | FK → `meals_mealservice.id` |
| `plate_count_id` | `char(32)` | Sim | — | FK → `counting_platecount.id` |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |
| `student_count_id` | `char(32)` | Sim | — | FK → `counting_studentcount.id` |
| `audit_log_id` | `char(32)` | Sim | — | FK → `api_auditlog.id` |
| `idempotency_key` | `char(32)` | Sim | — | — |
| `input_digest` | `varchar(64)` | Não | — | — |
| `reversal_of_id` | `char(32)` | Sim | — | FK → `counting_countadjustment.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "unique_count_adjustment_operation" ON "counting_countadjustment" ("actor_id", "school_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`
- `audit_log_id`
- `reversal_of_id`

#### `counting_deviceingestionevent`

**Finalidade.** Identifica os eventos de contagem recebidos dos dispositivos para evitar processamento duplicado e rastrear a contagem resultante.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `event_id` | `varchar(120)` | Não | — | — |
| `event_type` | `varchar(13)` | Não | — | — |
| `payload_hash` | `varchar(64)` | Não | — | — |
| `recorded_at` | `datetime` | Não | — | — |
| `received_at` | `datetime` | Não | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |
| `plate_count_id` | `char(32)` | Sim | — | FK → `counting_platecount.id` |
| `student_count_id` | `char(32)` | Sim | — | FK → `counting_studentcount.id` |

**Restrições de unicidade**

- `camera_id` + `event_id`
- `plate_count_id`
- `student_count_id`

#### `counting_platecount`

**Finalidade.** Registra quantidades de pratos efetivamente entregues por câmera, com vínculo ao serviço de refeição quando disponível.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `quantity` | `integer unsigned` | Não | — | — |
| `recorded_at` | `datetime` | Não | — | — |
| `source` | `varchar(10)` | Não | — | — |
| `external_event_id` | `varchar(120)` | Sim | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |
| `meal_service_id` | `char(32)` | Não | — | FK → `meals_mealservice.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "uq_plate_count_event" ON "counting_platecount" ("camera_id", "external_event_id") WHERE "external_event_id" IS NOT NULL`

#### `counting_studentcount`

**Finalidade.** Registra quantidades de entradas detectadas pelas câmeras. Uma mesma pessoa pode gerar várias entradas.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `quantity` | `integer unsigned` | Não | — | — |
| `recorded_at` | `datetime` | Não | — | — |
| `source` | `varchar(10)` | Não | — | — |
| `external_event_id` | `varchar(120)` | Sim | — | — |
| `camera_id` | `char(32)` | Não | — | FK → `cameras_camera.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "uq_student_count_event" ON "counting_studentcount" ("camera_id", "external_event_id") WHERE "external_event_id" IS NOT NULL`

### Infraestrutura do Django

#### `django_admin_log`

**Finalidade.** Registra inclusões, alterações e exclusões feitas pelo painel administrativo do Django.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `object_id` | `TEXT` | Sim | — | — |
| `object_repr` | `varchar(200)` | Não | — | — |
| `action_flag` | `smallint unsigned` | Não | — | — |
| `change_message` | `TEXT` | Não | — | — |
| `content_type_id` | `INTEGER` | Sim | — | FK → `django_content_type.id` |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |
| `action_time` | `datetime` | Não | — | — |

#### `django_content_type`

**Finalidade.** Identifica os modelos instalados pelo aplicativo e pelo nome do modelo, permitindo referências em permissões e registros administrativos.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `app_label` | `varchar(100)` | Não | — | — |
| `model` | `varchar(100)` | Não | — | — |

**Restrições de unicidade**

- `app_label` + `model`

#### `django_migrations`

**Finalidade.** Mantém o histórico das migrações já aplicadas pelo Django a este banco.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `app` | `varchar(255)` | Não | — | — |
| `name` | `varchar(255)` | Não | — | — |
| `applied` | `datetime` | Não | — | — |

#### `django_session`

**Finalidade.** Armazena os dados de sessões gerenciadas pelo Django e suas datas de expiração.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `session_key` | `varchar(40)` | Não | — | PK |
| `session_data` | `TEXT` | Não | — | — |
| `expire_date` | `datetime` | Não | — | — |

### Organizações e escolas

#### `institutions_organization`

**Finalidade.** Cadastra as organizações atendidas pelo Reali e reúne seus dados legais e de contato. Escolas e vínculos de usuários pertencem a uma organização.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `name` | `varchar(160)` | Não | — | — |
| `legal_name` | `varchar(200)` | Não | — | — |
| `cnpj` | `varchar(14)` | Sim | — | — |
| `email` | `varchar(254)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `phone` | `varchar(30)` | Não | — | — |

**Restrições de unicidade**

- `cnpj`

#### `institutions_school`

**Finalidade.** Cadastra as escolas de cada organização, com identificação, endereço e status de atividade.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `name` | `varchar(160)` | Não | — | — |
| `code` | `varchar(40)` | Não | — | — |
| `address` | `varchar(250)` | Não | — | — |
| `city` | `varchar(100)` | Não | — | — |
| `state` | `varchar(2)` | Não | — | — |
| `zip_code` | `varchar(9)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |

**Restrições de unicidade**

- `organization_id` + `code`

### Refeições e previsões

#### `meals_attendancesnapshot`

**Finalidade.** Fixa o total de entradas considerado no início do preparo, com a janela de contagem e a qualidade dos dados usados na previsão.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `reference_time` | `datetime` | Não | — | — |
| `total_student_entries` | `integer unsigned` | Não | — | — |
| `notes` | `TEXT` | Não | — | — |
| `meal_service_id` | `char(32)` | Não | — | FK → `meals_mealservice.id` |
| `created_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `data_quality_status` | `varchar(12)` | Não | — | — |
| `last_source_event_at` | `datetime` | Sim | — | — |
| `metadata` | `TEXT` | Não | — | — |
| `window_end_at` | `datetime` | Sim | — | — |
| `window_start_at` | `datetime` | Sim | — | — |

**Restrições de unicidade**

- `meal_service_id`

#### `meals_mealforecast`

**Finalidade.** Armazena a estimativa de pratos para um serviço de refeição, com a base de entradas, o método, os parâmetros e o nível de confiança.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `forecast_plates` | `integer unsigned` | Sim | — | — |
| `estimated_plates_per_entry` | `decimal` | Sim | — | — |
| `notes` | `TEXT` | Não | — | — |
| `attendance_snapshot_id` | `char(32)` | Não | — | FK → `meals_attendancesnapshot.id` |
| `generated_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `meal_service_id` | `char(32)` | Não | — | FK → `meals_mealservice.id` |
| `algorithm_version` | `varchar(30)` | Não | — | — |
| `confidence_status` | `varchar(12)` | Não | — | — |
| `method` | `varchar(20)` | Não | — | — |
| `parameters` | `TEXT` | Não | — | — |

**Restrições de unicidade**

- `attendance_snapshot_id`
- `meal_service_id`

#### `meals_mealforecastpolicy`

**Finalidade.** Define por escola e tipo de refeição a taxa inicial de pratos por entrada e o histórico exigido para gerar previsões.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `meal_type` | `varchar(10)` | Não | — | — |
| `initial_rate` | `decimal` | Sim | — | — |
| `minimum_history` | `smallint unsigned` | Não | — | — |
| `history_days` | `smallint unsigned` | Não | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |

**Restrições de unicidade**

- `school_id` + `meal_type`

#### `meals_mealschedule`

**Finalidade.** Define a programação recorrente de refeições da escola, com horários, dias da semana, datas excluídas e início da janela de contagem.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `meal_type` | `varchar(10)` | Não | — | — |
| `name` | `varchar(120)` | Não | — | — |
| `start_time` | `time` | Não | — | — |
| `end_time` | `time` | Sim | — | — |
| `entry_window_start` | `time` | Sim | — | — |
| `weekdays` | `TEXT` | Não | — | — |
| `excluded_dates` | `TEXT` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |

#### `meals_mealservice`

**Finalidade.** Representa uma ocorrência de refeição em determinada escola e data. Acompanha o preparo, a distribuição, a finalização e eventuais cancelamentos.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `date` | `date` | Não | — | — |
| `meal_type` | `varchar(10)` | Não | — | — |
| `scheduled_time` | `time` | Não | — | — |
| `status` | `varchar(12)` | Não | — | — |
| `preparation_started_at` | `datetime` | Sim | — | — |
| `serving_started_at` | `datetime` | Sim | — | — |
| `finished_at` | `datetime` | Sim | — | — |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |
| `cancellation_reason` | `varchar(500)` | Não | — | — |
| `cancelled_at` | `datetime` | Sim | — | — |
| `cancelled_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `created_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `entry_window_start` | `time` | Sim | — | — |
| `finished_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `history_excluded` | `bool` | Não | — | — |
| `preparation_started_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `scheduled_end_time` | `time` | Sim | — | — |
| `serving_data_quality` | `varchar(12)` | Não | — | — |
| `serving_started_by_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `schedule_id` | `char(32)` | Sim | — | FK → `meals_mealschedule.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "uq_meal_schedule_day" ON "meals_mealservice" ("schedule_id", "date") WHERE "schedule_id" IS NOT NULL`
- `school_id` + `date` + `meal_type` + `scheduled_time`

### Notificações e alertas

#### `notifications_alertincident`

**Finalidade.** Acompanha ocorrências que geram alertas e registra se já houve aviso ou escalonamento da condição.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `source` | `varchar(10)` | Não | — | — |
| `source_id` | `char(32)` | Não | — | — |
| `condition` | `varchar(12)` | Não | — | — |
| `opened_at` | `datetime` | Sim | — | — |
| `noticed` | `bool` | Não | — | — |
| `escalated` | `bool` | Não | — | — |

**Restrições de unicidade**

- `source` + `source_id` + `condition`

#### `notifications_alertscan`

**Finalidade.** Guarda o último identificador de origem processado por cada rotina de verificação de alertas, permitindo retomar a leitura desse ponto.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `name` | `varchar(20)` | Não | — | PK |
| `last_source_id` | `char(32)` | Sim | — | — |

#### `notifications_notification`

**Finalidade.** Armazena as notificações destinadas aos usuários, incluindo assunto, mensagem, prioridade e estado de leitura ou arquivamento.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `kind` | `varchar(32)` | Não | — | — |
| `title` | `varchar(160)` | Não | — | — |
| `message` | `varchar(500)` | Não | — | — |
| `priority` | `varchar(8)` | Não | — | — |
| `data` | `TEXT` | Não | — | — |
| `event_key` | `varchar(180)` | Não | — | — |
| `in_app` | `bool` | Não | — | — |
| `read_at` | `datetime` | Sim | — | — |
| `archived_at` | `datetime` | Sim | — | — |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `recipient_id` | `bigint` | Não | — | FK → `users_user.id` |
| `school_id` | `char(32)` | Sim | — | FK → `institutions_school.id` |

**Restrições de unicidade**

- `recipient_id` + `organization_id` + `event_key`

#### `notifications_notificationdelivery`

**Finalidade.** Acompanha as tentativas de entrega de uma notificação por canal, com status, retorno do provedor e programação de novas tentativas.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `channel` | `varchar(6)` | Não | — | — |
| `status` | `varchar(10)` | Não | — | — |
| `binding` | `char(32)` | Sim | — | — |
| `attempt_count` | `smallint unsigned` | Não | — | — |
| `receipt_attempt_count` | `smallint unsigned` | Não | — | — |
| `next_attempt_at` | `datetime` | Não | — | — |
| `provider_reference` | `varchar(100)` | Não | — | — |
| `accepted_at` | `datetime` | Sim | — | — |
| `last_error_code` | `varchar(40)` | Não | — | — |
| `lease_id` | `char(32)` | Sim | — | — |
| `lease_until` | `datetime` | Sim | — | — |
| `notification_id` | `char(32)` | Não | — | FK → `notifications_notification.id` |
| `device_id` | `char(32)` | Sim | — | FK → `notifications_pushdevice.id` |

**Restrições de unicidade**

- `CREATE UNIQUE INDEX "unique_notification_channel" ON "notifications_notificationdelivery" ("notification_id", "channel") WHERE NOT ("channel" = 'PUSH')`
- `CREATE UNIQUE INDEX "unique_notification_push" ON "notifications_notificationdelivery" ("notification_id", "device_id") WHERE ("channel" = 'PUSH' AND "device_id" IS NOT NULL)`

#### `notifications_notificationpreference`

**Finalidade.** Define por usuário, organização e tipo de notificação quais canais estão habilitados no aplicativo, por push ou por e-mail.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `kind` | `varchar(32)` | Não | — | — |
| `in_app` | `bool` | Não | — | — |
| `push` | `bool` | Não | — | — |
| `email` | `bool` | Não | — | — |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |

**Restrições de unicidade**

- `user_id` + `organization_id` + `kind`

#### `notifications_pushdevice`

**Finalidade.** Registra instalações vinculadas a usuários e sessões para entrega de notificações push, com token criptografado e estado do registro.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `installation` | `char(32)` | Não | — | — |
| `installation_digest` | `varchar(64)` | Não | — | — |
| `token_digest` | `varchar(64)` | Não | — | — |
| `encrypted_token` | `BLOB` | Não | — | — |
| `platform` | `varchar(7)` | Não | — | — |
| `session_id` | `char(32)` | Não | — | — |
| `session_version` | `integer unsigned` | Não | — | — |
| `session_expires_at` | `datetime` | Não | — | — |
| `binding` | `char(32)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `last_registered_at` | `datetime` | Não | — | — |
| `last_success_at` | `datetime` | Sim | — | — |
| `last_failure_at` | `datetime` | Sim | — | — |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |

**Restrições de unicidade**

- `installation`
- `token_digest`

#### `notifications_revokedpushsession`

**Finalidade.** Identifica sessões revogadas para impedir seu uso no registro ou envio de notificações push enquanto a revogação estiver vigente.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `session_id` | `char(32)` | Não | — | PK |
| `expires_at` | `datetime` | Não | — | — |

### Controle interno do SQLite

#### `sqlite_sequence`

**Finalidade.** Tabela interna que registra a sequência das tabelas com `AUTOINCREMENT`. Suas colunas não têm tipo declarado.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `name` | — | Sim | — | — |
| `seq` | — | Sim | — | — |

### Tokens JWT

#### `token_blacklist_blacklistedtoken`

**Finalidade.** Registra quais tokens JWT rastreados pelo Simple JWT foram invalidados e a data da inclusão na lista de bloqueio.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `blacklisted_at` | `datetime` | Não | — | — |
| `token_id` | `bigint` | Não | — | FK → `token_blacklist_outstandingtoken.id` |
| `id` | `INTEGER` | Não | — | PK |

**Restrições de unicidade**

- `token_id`

#### `token_blacklist_outstandingtoken`

**Finalidade.** Mantém o inventário de tokens JWT rastreados pelo Simple JWT, com identificador, usuário e validade, para permitir seu controle e bloqueio.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `token` | `TEXT` | Não | — | — |
| `created_at` | `datetime` | Sim | — | — |
| `expires_at` | `datetime` | Não | — | — |
| `user_id` | `bigint` | Sim | — | FK → `users_user.id` |
| `jti` | `varchar(255)` | Não | — | — |
| `id` | `INTEGER` | Não | — | PK |

**Restrições de unicidade**

- `jti`

### Usuários e vínculos

#### `users_membership`

**Finalidade.** Vincula um usuário a uma organização e define seu papel, o estado do vínculo e se pode acessar todas as escolas. Os cargos vigentes são `MANAGER`, `NUTRITIONIST`, `COOK` e `SECRETARIAT`. Vínculos históricos `TEACHER` ficam inativos até receberem um cargo vigente e serem reativados.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `role` | `varchar(20)` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `organization_id` | `char(32)` | Não | — | FK → `institutions_organization.id` |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |
| `all_schools_access` | `bool` | Não | — | — |

**Restrições de unicidade**

- `user_id` + `organization_id`

#### `users_schoolaccess`

**Finalidade.** Indica quais escolas específicas podem ser acessadas por meio de um vínculo do usuário com uma organização.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `char(32)` | Não | — | PK |
| `created_at` | `datetime` | Não | — | — |
| `updated_at` | `datetime` | Não | — | — |
| `membership_id` | `char(32)` | Não | — | FK → `users_membership.id` |
| `school_id` | `char(32)` | Não | — | FK → `institutions_school.id` |

**Restrições de unicidade**

- `membership_id` + `school_id`

#### `users_user`

**Finalidade.** Armazena a conta usada para autenticação, com e-mail, nome, hash da senha, estado da conta e versão da sessão.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `password` | `varchar(128)` | Não | — | — |
| `last_login` | `datetime` | Sim | — | — |
| `is_superuser` | `bool` | Não | — | — |
| `first_name` | `varchar(150)` | Não | — | — |
| `last_name` | `varchar(150)` | Não | — | — |
| `is_staff` | `bool` | Não | — | — |
| `is_active` | `bool` | Não | — | — |
| `date_joined` | `datetime` | Não | — | — |
| `email` | `varchar(254)` | Não | — | — |
| `full_name` | `varchar(160)` | Não | — | — |
| `session_version` | `integer unsigned` | Não | — | — |

**Restrições de unicidade**

- `(expressão)`
- `email`

#### `users_user_groups`

**Finalidade.** Associa usuários aos grupos de permissões do Django.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |
| `group_id` | `INTEGER` | Não | — | FK → `auth_group.id` |

**Restrições de unicidade**

- `user_id` + `group_id`

#### `users_user_user_permissions`

**Finalidade.** Associa permissões do Django diretamente a usuários.

| Coluna | Tipo declarado | Aceita NULL | Padrão SQL | Chaves e referências |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | Não | — | PK |
| `user_id` | `bigint` | Não | — | FK → `users_user.id` |
| `permission_id` | `INTEGER` | Não | — | FK → `auth_permission.id` |

**Restrições de unicidade**

- `user_id` + `permission_id`
