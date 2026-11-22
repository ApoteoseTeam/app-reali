# Auditoria multi-tenant

O header JWT identifica a conta e `X-Organization-ID` escolhe o contexto. O Django exige a combinação de vínculo ativo, organização ativa, papel e escolas concedidas por `SchoolAccess` ou pelo escopo institucional. Os endpoints de agente usam credenciais próprias limitadas à escola. A API de auditoria interna exige permissão registrada no Django.

| Papel | Operações principais verificadas em contratos |
| --- | --- |
| Direção e administrador legado | Configuração escolar, funcionários, credenciais, preparação, indicadores, ajustes e auditoria no escopo concedido. |
| Gestão | Planejamento, transições, relatórios, recálculo e ajustes no escopo concedido. |
| Nutrição e Secretaria | Relatórios, histórico, indicadores, status e consultas de contagem permitidas. |
| Cozinha | Preparo, distribuição, previsão e consultas operacionais da escola. |
| Professor | Indicadores limitados às entradas e catálogo restrito do RealInova. |
| Operador da plataforma | Provisionamento, suporte, sessões e auditoria de acordo com permissões Django concedidas. A permissão interna de cada operação é independente. |

Os testes usam duas organizações, duas escolas no primeiro vínculo e uma escola externa. Confirmam listagem, filtros, detalhe, operações administrativas, relatórios, exportação, previsões, contagens, conversas, notificações e auditoria conforme a ação. O teste HTTP novo valida o vínculo de cozinha recém-ativado, a escola concedida, o bloqueio de outra organização e o bloqueio da segunda escola.

As suítes existentes cobrem revogação de papel e escola com sessão ativa, desativação da conta, conversas restritas e checagem de acesso durante execução RealInova. O app cancela as requisições e descarta o cache ao trocar o contexto. Os contratos e testes do frontend complementam a verificação no servidor. [Matriz de permissões](PERMISSIONS.md)
