# Auditoria administrativa

A auditoria reaproveita `AuditLog` e acrescenta escola, categoria do recurso e ID de requisição retornado em `X-Request-ID`. Operações auditáveis incluem câmeras e credenciais, convites e vínculos, criação e atualização de escolas, merenda, correções e reversões, consolidação e exportação, preferências e recusas administrativas relevantes.

`GET /api/v1/audit-logs/` e `GET /api/v1/audit-logs/{id}/` exigem JWT, `X-Organization-ID` e papel de direção. Direção com escopo limitado só recebe auditorias das escolas atribuídas. Direção com acesso integral recebe também eventos gerais da organização. `GET /api/v1/admin/audit-logs/` e sua rota de detalhe exigem operador ativo `is_staff` e `api.view_auditlog`.

A lista paginada aceita `start_date`, `end_date`, `actor_id`, `action`, `school_id`, `target_type`, `target_id` e `page`. A rota de plataforma aceita também `organization_id`. A resposta inclui `occurred_at`, `actor`, `organization`, `school`, `target_type`, `target_id`, `request_id` e metadados permitidos. As rotas expõem somente leitura.

A limpeza operacional remove registros antigos após 730 dias por padrão, preservando auditorias ligadas a correções por FK protegida. Controle acesso ao banco e backups, separe credenciais de operação e de manutenção e use as políticas de retenção da organização. Quem possui escrita no banco conserva a capacidade de modificar dados diretamente.
