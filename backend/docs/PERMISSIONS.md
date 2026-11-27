# Permissões institucionais

A matriz de papéis fica em `apps/api/permissions.py`. Todas as operações estão limitadas ao vínculo ativo e às escolas concedidas.

| Ação | Gestor | Nutricionista | Cozinha | Secretaria |
|---|---|---|---|---|
| Indicadores | Sim | Sim | Últimos 30 dias | Sim |
| Histórico de serviços | Sim | Sim | Últimos 30 dias | Sim |
| Contagens brutas | Sim | Sim | Sem acesso | Sim |
| Iniciar preparo, distribuição ou finalizar | Sim | Sem acesso | Sim | Sem acesso |
| Consultar previsão | Sim | Sim | Em serviços dos últimos 30 dias | Sim |
| Gerenciar serviços ou recalcular métricas | Sim | Sem acesso | Sem acesso | Sem acesso |
| Gerenciar funcionários e convites | Sim | Sem acesso | Sem acesso | Sem acesso |
| Configurar escolas, câmeras e políticas de previsão | Sim | Sem acesso | Sem acesso | Sem acesso |
| Consultar auditoria institucional | Sim | Sem acesso | Sem acesso | Sem acesso |
| RealInova | Sim | Sim | Com limite operacional | Sim |

Não há histórico individual de estudantes. Um gestor de escopo restrito edita escolas concedidas e gerencia somente vínculos subordinados que tenham todo o escopo dentro do seu. Criar escola, atribuir o cargo de gestor ou conceder acesso institucional exige um gestor com acesso institucional.

A equipe Reali usa permissões Django separadas. `is_staff` com `api.review_institutions` autoriza análise, provisionamento e recuperação do convite inicial do gestor. `is_staff` com `api.manage_account_sessions` autoriza revogar sessões globais e desativar contas comuns. Os papéis institucionais não concedem essas permissões. Uma conta interna só acessa dados institucionais usando um vínculo autorizado.

O módulo de câmeras usa permissões próprias de status, histórico e administração, descritas na [matriz de câmeras](CAMERAS.md).
