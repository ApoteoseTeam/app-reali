# Contrato HTTP de autenticação e acesso

Base `/api/v1/`, JSON em UTF-8, JWT em `Authorization: Bearer <access>`. Rotas de gestão e escolas exigem `X-Organization-ID`. A documentação navegável está em `/api/docs/` com `DEBUG=true`.

| Método e caminho | Quem pode usar | Resposta de sucesso |
|---|---|---|
| `POST /auth/login/`, `POST /auth/refresh/`, `POST /auth/logout/` | Credencial, refresh e refresh, respectivamente | `200` com pares de tokens nas duas primeiras e objeto vazio no logout |
| `GET /auth/me/`, `GET /auth/me/schools/` | Usuário autenticado, com vínculo ativo para escolas | `200` com usuário/vínculos e escolas ativas paginadas, respectivamente |
| `POST /auth/change-password/` | Usuário autenticado | `204` |
| `POST /auth/password-reset/request/`, `POST /auth/password-reset/confirm/` | Público | `202` genérico e `204`, respectivamente |
| `POST /institution-requests/` | Público | `201` com solicitação pendente |
| `GET /admin/institution-requests/`, `GET /admin/institution-requests/{id}/` | Equipe com permissão de análise | `200` com lista paginada ou detalhe |
| `POST /admin/institution-requests/{id}/approve/`, `POST /admin/institution-requests/{id}/reject/` | Equipe com permissão de análise | `200` com solicitação revisada |
| `POST /admin/organizations/provision/` | Equipe com permissão de análise | `201` com `organization` e `initial_invitation` |
| `POST /admin/organizations/{id}/initial-invitation/` | Equipe com permissão de análise, sem gestor ativo com acesso institucional | `201` com novo convite de recuperação |
| `POST /admin/initial-invitations/{id}/resend/` ou `/revoke/` | Equipe com permissão de análise | `200` com o convite atualizado |
| `POST /admin/users/{id}/revoke-sessions/` ou `/deactivate/` | Equipe com permissão de contas | `204` |
| `POST /invitations/` | Gestor autorizado | `201` com convite e estado do transporte |
| `GET /invitations/`, `GET /invitations/{id}/` | Gestor autorizado | `200` com até 100 itens recentes ou detalhe |
| `POST /invitations/{id}/revoke/` ou `/resend/` | Gestor autorizado | `200` com convite atualizado |
| `POST /auth/invitations/verify/` | Público | `200` com `{"valid":true}` |
| `POST /auth/invitations/activate/` | Público para conta nova, com sessão do destinatário para conta existente | `200` com mensagem |
| `GET /memberships/`, `GET /memberships/{id}/`, `PATCH /memberships/{id}/` | Gestor autorizado | `200` com lista paginada ou vínculo |
| `POST /memberships/{id}/deactivate/` ou `/reactivate/` | Gestor autorizado | `200` com vínculo atualizado |
| `GET /memberships/{id}/schools/`, `PUT /memberships/{id}/schools/` | Gestor autorizado | `200` com `school_ids` e `all_schools_access` |

A listagem de vínculos aceita `organization`, `school`, `role` e `is_active`. O PATCH recebe `role`. Ativação e recuperação recebem `password_confirmation` junto da senha. Para aceitar com conta existente, envie somente `token` e o JWT dessa conta. Campos de papel e escola enviados na ativação não concedem privilégios. Listas paginadas usam `count`, `next`, `previous` e `results`.

## Exemplos

Login e resposta resumida

```json
{"email":"funcionario@example.com","password":"senha da conta"}
```

```json
{"access":"<jwt>","refresh":"<jwt>","user":{"id":42,"email":"funcionario@example.com","full_name":"Beatriz Santos"}}
```

Solicitação pública e aprovação correspondente

```json
{"organization_name":"Rede Municipal","contact_name":"Ana Santos","contact_email":"ana@example.com","phone":"","message":""}
```

```json
{"schools":[{"name":"Escola Municipal","code":"EM-01"}],"manager_email":"gestor@example.com"}
```

O provisionamento direto acrescenta `name`, `email` e `phone` ao corpo da aprovação. O campo `manager_email` é obrigatório nesse fluxo. O campo legado `director_email` continua aceito quando `manager_email` estiver ausente. A rejeição recebe `{"rejection_reason":"Motivo da decisão"}`. A recuperação do gestor inicial recebe `{"email":"gestor@example.com"}`.

Convite e substituição de escolas

```json
{"email":"cozinha@example.com","role":"COOK","all_schools_access":false,"school_ids":["a0c5908d-79cb-4631-a0d4-c0f02fafc250"]}
```

O PUT de escolas usa somente os dois campos de escopo do exemplo. Para conceder todas as escolas, envie `true` e uma lista vazia. O reenvio retorna o mesmo ID com nova validade. `SENT` indica aceite pelo transporte.

Ativação de conta nova e confirmação de recuperação

```json
{"token":"<prova>","full_name":"Beatriz Santos","password":"<nova senha>","password_confirmation":"<nova senha>"}
```

A confirmação de recuperação omite `full_name`. A solicitação de recuperação recebe `{"email":"cozinha@example.com"}`. A troca de senha recebe `current_password`, `password` e `password_confirmation`. Refresh e logout recebem `{"refresh":"<jwt>"}`.

## Erros

- `400` inclui erro por campo ou `detail`. Exemplo de resposta `400` `{"token":"Convite inválido, expirado ou utilizado."}`.
- `401` cobre sessão ausente, inválida ou revogada. Na ativação, `{"code":"login_required","detail":"Entre com a conta convidada para aceitar este vínculo."}` indica que o app deve solicitar login e reapresentar a prova.
- `403` indica falta de autorização. `404` protege detalhes fora do escopo. `429` indica limite temporário.

Leia os [fluxos de convites](INVITATIONS.md) e as [permissões por papel](PERMISSIONS.md).
