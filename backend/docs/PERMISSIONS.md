# Permissões institucionais

A matriz de papéis fica em `apps/api/permissions.py`. Todas as operações estão limitadas ao vínculo ativo e às escolas concedidas.

| Ação | Diretor | Gestor | Nutricionista | Cozinha | Professor | Secretaria |
|---|---|---|---|---|---|---|
| Indicadores | Sim | Sim | Sim | Últimos 30 dias | Entradas agregadas dos últimos 30 dias | Sim |
| Histórico de serviços | Sim | Sim | Sim | Últimos 30 dias | Sem acesso | Sim |
| Contagens brutas | Sim | Sim | Sim | Sem acesso | Sem acesso | Sim |
| Iniciar preparo, distribuição ou finalizar | Sim | Sim | Sem acesso | Sim | Sem acesso | Sem acesso |
| Consultar previsão | Sim | Sim | Sim | Em serviços dos últimos 30 dias | Sem acesso | Sim |
| Gerenciar serviços ou recalcular métricas | Sim | Sim | Sem acesso | Sem acesso | Sem acesso | Sem acesso |
| Gerenciar funcionários e convites | Sim | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso |
| Configurar escolas e câmeras | Sim | Sem acesso | Sem acesso | Sem acesso | Sem acesso | Sem acesso |
| RealInova, para fase posterior | Previsto | Previsto | Previsto | Previsto com limite | Previsto com limite | Previsto |

Resultados de indicadores para professor apresentam `null` nos campos de previsão e pratos servidos. Não há histórico individual de estudantes. Um diretor de escopo restrito edita escolas concedidas e gerencia somente vínculos subordinados que tenham todo o escopo dentro do seu. Criar escola ou atribuir direção e acesso institucional exige um diretor com acesso institucional.

A equipe Reali usa permissões Django separadas. `is_staff` com `api.review_institutions` autoriza análise, provisionamento e recuperação da direção. `is_staff` com `api.manage_account_sessions` autoriza revogar sessões globais e desativar contas comuns. Os papéis institucionais não concedem essas permissões. Uma conta interna só acessa dados institucionais usando um vínculo autorizado.

O módulo de câmeras usa permissões próprias de status, histórico e administração, descritas na [matriz de câmeras](CAMERAS.md).
