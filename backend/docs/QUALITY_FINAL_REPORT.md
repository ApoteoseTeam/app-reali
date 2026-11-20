# Reali | Relatório de qualidade da Fase 10

Data da auditoria local em 20 de novembro de 2026. O escopo incluiu backend Django, PostgreSQL, integração de agentes, aplicativo Expo, RealInova e notificações.

## Resumo executivo

A auditoria endureceu a revogação de sessões, a exposição de destinos em notificações, o tratamento de falha na saída mobile, HSTS e versões de dependências. A regressão usa contratos REST, PostgreSQL real em ambiente isolado, e-mail em memória e provedores simulados. A configuração de integração contínua adiciona verificação independente de backend, frontend e segurança.

## Inventário

| Área | Implementação principal |
| --- | --- |
| API, usuários e instituições | `api`, `users`, `institutions` e base comum `core`. JWT, convites, recuperação, organizações, escolas, membros, concessões por escola e trilha `AuditLog`. |
| Câmeras e contagens | `cameras` e `counting`. Câmera/agente, credencial, configuração, heartbeat, histórico, ledger, entradas, pratos e correções auditadas. |
| Merenda, previsão e indicadores | `meals` e `analytics`. Serviço, agenda, snapshot, política, previsão, `DailyMetrics`, fila de reconciliação, histórico, dashboard e exportações. |
| RealInova | `ai`. Conversa, mensagem, execução, ferramentas de leitura, proveniência, backend de provedor e retenção. |
| Notificações | `notifications`. Central, preferências, dispositivos, revogação, entregas, incidentes, cursor e tarefas de monitoramento. |
| Aplicativo | Expo Router, sessão e HTTP comuns. Início, perfil, escolha de contexto, merenda, contagens, câmeras, funcionários, relatório, histórico, chat, central e preferências. |
| Integrações | Agentes HTTP existentes, PostgreSQL, SMTP, Expo Push e provedor compatível com OpenAI para Agno. |

O ensaio usou Python 3.14.8, Django 5.2.19, DRF 3.18.3, Simple JWT 5.5.1, PostgreSQL 18.6, Agno 2.9.0, OpenAI 2.54.0, cryptography 50.0.2, Node 24.21.0, Expo 58.0.26, React Native 0.88.1 e TypeScript 6.0.3.

## Segurança, integridade e qualidade

Os achados documentam impacto, arquivo, correção e o teste que verifica o contrato. O pipeline local de análise usa Ruff, Bandit, pip-audit, npm audit e Gitleaks. O isolamento é verificado com duas organizações e múltiplas escolas, incluindo revogações, escopo de dispositivo e separação da auditoria. O banco foi migrado em base limpa e as corridas relevantes foram verificadas com PostgreSQL.

O fluxo HTTP novo reúne convite, ativação, login, escopo, heartbeat, reenvio idempotente, preparo, previsão, distribuição, consolidação, exportação, conversa e alerta com recuperação de câmera. A cobertura e a carga sintética têm evidências próprias.

| Verificação | Resultado |
| --- | --- |
| PostgreSQL e pytest | 115 aprovados. As duas cargas opcionais foram executadas separadamente e passaram. |
| Cobertura | Python 93% em 6.219 instruções medidas. Cliente TypeScript medido em 92,31% de linhas, 83,93% de ramos e 54,39% de funções. |
| Aplicativo | 17 testes Node, lint, TypeScript, Expo Doctor 20/20, fingerprint Expo, bundles Android/iOS/web e fluxo do cliente TypeScript contra Django em loopback. |
| Segurança estática | Ruff passou. Bandit sem achados médios ou altos após revisão da consulta parametrizada, com nove observações baixas revisadas. |
| Dependências e segredos | pip-audit e npm audit sem avisos conhecidos ao final. Gitleaks sem ocorrências em 113 commits e no snapshot local analisado. |
| Migrações e contrato | Banco PostgreSQL novo migrado, modelos sincronizados e OpenAPI validado com `--fail-on-warn` para 190 entradas de caminho e 247 operações, incluindo variantes de formato. |
| Desempenho | 180 requisições de ingestão e 92 no cenário misto, ambas sem erros. O relatório de carga tem percentis, throughput, SQL e dados do processo. |
| CI | Workflow validado localmente com actionlint 1.7.12. |

- [Achados, correções e testes](SECURITY_FINDINGS.md) · [Segurança e privacidade](SECURITY_AUDIT.md) · [Autenticação](AUTHENTICATION_AUDIT.md) · [Multi-tenant](MULTITENANCY_AUDIT.md)
- [Integridade](DATABASE_INTEGRITY.md) · [Câmeras e ingestão](CAMERA_INTEGRATION_TESTS.md) · [Previsão](FORECAST_VALIDATION.md) · [Analytics](ANALYTICS_VALIDATION.md)
- [RealInova](REALINOVA_SECURITY_TESTS.md) · [Mobile](MOBILE_SECURITY_AUDIT.md) · [Notificações](NOTIFICATIONS_TESTS.md)
- [Cobertura](TEST_COVERAGE.md) · [Carga](PERFORMANCE_TESTS.md) · [Pipeline](CI_PIPELINE.md)

## Pendências e veredito

**Apto para homologação controlada.** A classificação se aplica ao cenário com dados fictícios e configuração isolada.

- Homologar assinatura, armazenamento e navegação em dispositivos Android/iOS, App Links e Universal Links do domínio e push real com FCM/APNs.
- Conferir credenciais, comportamento SMTP, provedor RealInova, monitoramento, execução dos workers e retenção no ambiente operado.
- Testar TLS/proxy, mitigação compartilhada de tentativas, política CORS se houver web, backups e autorização de recuperação de conta. No check sintético, `security.W005` e `security.W021` permanecem enquanto subdomínios e preload HSTS aguardam validação da topologia.
- Executar o workflow no GitHub e avaliar escala, recursos do banco e comportamento em janela representativa antes de piloto. Governança e privacidade exigem os responsáveis da operação.
- A instalação de dependências alertou sobre o ciclo de suporte do ESLint 9. O lint atual foi validado com Expo SDK 58. A migração do lint depende de compatibilidade com o conjunto Expo.
