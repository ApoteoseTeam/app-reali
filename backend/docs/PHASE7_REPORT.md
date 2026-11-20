# Relatório da Fase 7

O RealInova está integrado ao Django com o Agno 2.9.0. Ele escolhe consultas de indicadores, e o backend monta respostas em português com dados e fontes autorizados. Conversas, mensagens, auditoria e consumo são persistidos no PostgreSQL.

## Inventário

| Área | Arquivos |
| --- | --- |
| App e dados | Criados `backend/apps/ai/apps.py`, `models.py` e `migrations/0001_initial.py`. A migração cria `AIConversation`, `AIMessage` e `AIExecution`, com índices de histórico e cota e constraints de idempotência e execução pendente. |
| Execução e isolamento | Criados `apps/ai/agent.py`, `authorization.py`, `errors.py`, `provider.py`, `services.py` e `tools.py`. |
| API | Criados `apps/ai/serializers.py`, `views.py` e `urls.py`. Alterados `apps/api/urls.py`, `apps/users/models.py` e `config/settings.py` para registrar app, rotas, schema e throttling. |
| Operação | Criado `apps/ai/management/commands/prune_realinova.py`. Atualizados `requirements.txt` e `.env.example`. |
| Validação | Criados `apps/ai/test_real_inova.py` e o cenário local `postman/simulations/realinova/`, com mock em `postman/mocks/realinova-provider/`. |
| Documentação | Adicionados os dez guias abaixo e este relatório. Atualizados `README.md` e `API_ENDPOINTS.md` do backend. |

## Guias

- [Arquitetura e sequência](REALINOVA_ARCHITECTURE.md) e [agente](REALINOVA_AGENT.md).
- [Oito ferramentas e serviços reutilizados](REALINOVA_TOOLS.md) e [permissões por perfil](REALINOVA_PERMISSIONS.md).
- [Endpoint de chat, conversas, utilização e contrato React Native](REALINOVA_API.md) e [histórico e retenção](REALINOVA_CONVERSATIONS.md).
- [Configuração de provedor e fallback](REALINOVA_PROVIDERS.md) e [controle de custos](REALINOVA_COSTS.md).
- [Proteções verificadas e limites de segurança](REALINOVA_SECURITY.md) e [testes e resultados](REALINOVA_TESTS.md).

A integração preserva a fonte de verdade analítica e a autenticação de sessão existentes. A revisão tratou riscos de vazamento por troca de escopo, reaproveitamento de históricos após revogação, repetição de cobranças após perda de conexão, referências fabricadas e conteúdo controlado pelo provedor. O contrato usa HTTP JSON convencional e recuperação por idempotência. A implantação requer migração, agendamento da retenção e configuração de um provedor aprovado.

## Estado da validação

- **Validado localmente.** Autenticação e isolamento, ferramentas sobre tabelas e projeções Django, histórico e exclusão, comando de retenção, aplicação de cota, idempotência concorrente, falhas de provedor simuladas e exemplos do contrato. Foram 93 testes na suíte PostgreSQL e 24 na rodada focada final do RealInova. [Evidências e resultados](REALINOVA_TESTS.md)
- **Atenção na implantação.** O check de produção apontou HSTS ausente. A ativação precisa das credenciais, do modelo e das tarifas do provedor aprovado. O teste com o provedor contratado e a integração React Native permanecem por verificar. [Configuração do ambiente](REALINOVA_PROVIDERS.md)
