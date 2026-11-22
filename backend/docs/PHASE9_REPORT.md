# Reali | Relatório da Fase 9

## Auditoria inicial e implementação

O backend já registrava `CameraHealthEvent`, `AuditLog`, `CountAdjustment`, previsões, métricas e e-mails transacionais de conta. A correção já preservava a contagem automática e gerava recálculo. Faltavam a consulta individual do ajuste, a chave de idempotência por operação, a consulta REST da auditoria administrativa e a central de avisos. O aplicativo já tinha sessão JWT, escopo de escola e componentes reutilizáveis, e o sino comum ainda tinha uma ação local de diagnóstico.

O novo app Django `notifications` reúne catálogo, resolução de destinatários, preferências, registro de aparelhos, publicação, avaliação de alertas e entrega. Os eventos de merenda, convites, vínculos, ajustes e indicadores foram conectados aos serviços existentes. O monitoramento usa os estados e a telemetria já persistidos no Django. A central React Native agrega o contador no sino, lista, filtros, detalhe, leitura, arquivo, preferências, registro Expo e abertura autorizada.

As migrações são incrementais.

| App | Migração e efeito |
| --- | --- |
| `notifications` | `0001_initial` cria `Notification`, `NotificationDelivery`, `NotificationPreference`, `PushDevice`, `RevokedPushSession`, `AlertIncident` e `AlertScan`. |
| `api` | `0003` acrescenta escola, recurso e ID de requisição a `AuditLog`. |
| `counting` | `0004` acrescenta auditoria e idempotência a `CountAdjustment`. `0005` associa ajustes históricos a auditorias localizáveis e preenche o escopo histórico quando há evidência. |
| `analytics` | `0003` preserva a primeira inclusão da pendência no ciclo de consolidação. |

## Estado de cada entrega

| Funcionalidade | Classificação e resultado |
| --- | --- |
| Central in-app e API multi-tenant | Implementada e validada. Filtros, paginação, contador, leitura idempotente, leitura em massa, histórico arquivado, isolamento e links autorizados foram cobertos. |
| Preferências por tipo e canal | Implementadas e validadas. Canal obrigatório da conta, opt-out, canais disponíveis e atualização autenticada foram exercitados. |
| Eventos, destinatários, alertas e agendamento | Implementados e validados com telemetria e operações de teste. O catálogo, a janela, os limites e os destinatários estão no [guia de eventos](NOTIFICATIONS_EVENTS.md). |
| Fila de push e SMTP | Implementada e validada com banco PostgreSQL e provedores simulados. A simulação HTTP validou aceitação, recibo e recuperação de HTTP 503. O teste de SMTP validou falha transitória, retry e aceitação pelo transporte simulado. |
| Registro, renovação, revogação e troca de conta | Implementados e validados na API e nos testes de contrato do app. O backend verifica a sessão, prova da instalação e propriedade da inscrição. |
| Execução e apresentação de push em Android e iOS | Implementadas, com tipos e bundles verificados. A execução nativa, a apresentação e a chegada no aparelho aguardam um ambiente assinado com APNs e FCM. |
| Convites e conta | Implementados e validados. A criação, o vencimento e a auditoria usam o fluxo seguro da conta. O alerta de vínculo ativo é privado do titular. |
| Correções, reversões e recálculo | Implementados e validados. Os testes verificam rejeições, reversão, idempotência, totais não negativos, integridade da origem e rollback quando a auditoria falha. |
| Consulta de auditoria | Implementada e validada em escopo institucional. Os operadores de plataforma têm rota e permissão Django próprias, conforme o [contrato da auditoria](ADMIN_AUDIT.md). |
| `REPORT_READY` e `SYSTEM_ANNOUNCEMENT` | Parcialmente implementados. O catálogo conhece esses tipos. Disparadores estão reservados para um fluxo de relatórios assíncronos e comunicados. |
| Provedores e agendador em produção | Pendentes de configuração e validação no ambiente de operação. |

Os endpoints e exemplos estão nos contratos de [notificações](NOTIFICATIONS_API.md), [ajustes](COUNT_ADJUSTMENTS.md) e [auditoria](ADMIN_AUDIT.md). A central in-app, o push Expo e o SMTP usam estados de entrega próprios.

## Validação e operação

- Migrações aplicadas sobre uma cópia local PostgreSQL da Fase 8. Um teste de atualização com dados anteriores à fase verificou a preservação da contagem, do ajuste, do escopo da auditoria e da idade da pendência. Os três modos de `process_notifications` foram executados.
- `check`, verificação de migrações, plano de migração, schema OpenAPI, lint do frontend, TypeScript e Expo Doctor foram executados.
- O Expo Doctor aprovou 20 verificações. O frontend aprovou 16 testes e gerou bundles Android, iOS e web.
- A suíte PostgreSQL aprovou 107 testes com a simulação HTTP ativa. O teste de carga opcional ficou fora dessa execução. A suíte dedicada aprovou os 14 testes da fase, incluindo a simulação do provedor.
- O teste de carga opcional passou separadamente. Foram 180 requisições de seis instalações sintéticas, 504 eventos únicos persistidos, 36 eventos reconhecidos como reenvios e zero erros.
- O Postman verificou o HTTP 200 da caixa de entrada da escola e o HTTP 401 esperado para consulta anônima no servidor de desenvolvimento.
- A validação de implantação apontou `security.W004` para HSTS. A configuração de HSTS depende do domínio e do proxy HTTPS da implantação.

Produção exige aplicar as migrações, agendar as rotinas, definir as chaves Fernet, configurar SMTP e usar builds nativos com as credenciais do projeto Expo. Consulte [agendamento](NOTIFICATIONS_SCHEDULING.md), [push](NOTIFICATIONS_PUSH.md), [e-mail](NOTIFICATIONS_EMAIL.md) e [teste em dispositivo](NOTIFICATIONS_TESTS.md).
