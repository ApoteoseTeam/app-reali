# API de notificações

Prefixo `/api/v1/`. Requer `Authorization: Bearer <access>`. Central e preferências exigem `X-Organization-ID`. O parâmetro opcional `school_id` restringe a operação à escola autorizada escolhida e mantém avisos gerais da organização. Sem ele, a central abrange as escolas vigentes do vínculo. Os dispositivos são vinculados à conta autenticada e dispensam o cabeçalho institucional.

| Método | Caminho | Entrada e resposta |
| --- | --- | --- |
| GET | `notifications/` | `school_id`, `unread`, `archived` (padrão falso), `type` e `page`. Resposta paginada com 50 registros, do mais recente ao mais antigo. |
| GET | `notifications/unread-count/` | `school_id`. Retorna `{"unread_count": 3}` na caixa de entrada. |
| GET | `notifications/{id}/` | `school_id`. Retorna o aviso autorizado, inclusive se arquivado. A API remove a ação quando o recurso ficou indisponível. |
| POST | `notifications/{id}/read/` | `school_id`. Retorna o aviso com `read_at`. Repetições mantêm o horário original. |
| POST | `notifications/read-all/` | `school_id`. Retorna `{"updated": 3}` para itens pendentes da caixa de entrada. |
| POST | `notifications/{id}/archive/` | `school_id`. Retorna o aviso com `archived_at`. Arquivar retira da contagem de não lidas. |
| GET/PATCH | `notifications/preferences/` | Lista ou altera preferências por tipo. Exemplo de PATCH `{"notification_type":"CAMERA_OFFLINE","push":true}`. |
| POST | `notifications/push-devices/` | Recebe `installation` UUID, `installation_secret` com 64 caracteres hexadecimais, `push_token` e `platform` (`ANDROID` ou `IOS`). Responde 201 com ID, plataforma, estado e data de registro. |
| DELETE | `notifications/push-devices/{id}/` | Revoga uma inscrição própria e retorna 204. |

Um aviso contém `id`, `organization`, `school`, `school_name`, `notification_type`, `type_label`, `title`, `message`, `priority`, `data`, `created_at`, `read_at` e `archived_at`. O detalhe resolve destinos reconhecidos em `data` para `camera`, `meal` ou `reports` com a permissão atual. Lista, leitura e arquivamento entregam `data` vazio. A API do destino também verifica o acesso efetivo.

A API retorna 400 para entrada inválida, 401 para autenticação inválida, 403 para vínculo indisponível, 404 para objetos fora do escopo, 409 para colisão de inscrição e 503 para push sem chave configurada. O Django gera o contrato OpenAPI no endpoint de schema do projeto.

Veja também [ajustes](COUNT_ADJUSTMENTS.md) e [auditoria](ADMIN_AUDIT.md).
