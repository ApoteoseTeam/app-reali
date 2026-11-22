# Relatório da Fase 6

## Auditoria e decisão

A fase partiu de `DailyMetrics` e de sua unicidade por escola/data, da listagem e do recálculo manual legados. As Fases 4 e 5 já forneciam fatos deduplicados, ajustes auditados, snapshots imutáveis, previsão operacional única e escopos por organização e escola. A Fase 6 aproveita essas fontes e acrescenta disponibilidade, fechamento, estatísticas por serviço e reconciliação transacional.

O risco principal era perder a atualização quando uma contagem chegasse durante o cálculo. A fila e a projeção compartilham os bloqueios necessários para que a escrita posterior volte a enfileirar o dia. Um segundo risco era a ordem de bloqueios da auditoria diante de ajustes, resolvido adquirindo primeiro o bloqueio de chave na organização. Para compatibilidade, o endpoint legado de recálculo continua ativo e os totais existentes são preservados até a reconciliação. Após o recálculo, um valor ausente pode passar a `null`. O filtro de escola fora do escopo retorna 404.

## Inventário

| Área | Criados ou alterados |
| --- | --- |
| Projeções | Alterado `apps/analytics/models.py`. Criada `apps/analytics/migrations/0002_dailymetrics_compared_served_and_more.py`. A migração adiciona campos ao `DailyMetrics` e cria `PendingDailyMetrics`. |
| Consolidação e leitura | Criados `apps/analytics/dirty.py`, `services.py`, `selectors.py` e `reporting.py`, além de `management/commands/reconcile_daily_metrics.py` e seus inicializadores. |
| API e arquivos | Criados `apps/analytics/serializers.py`, `views.py` e `exports.py`. Alterados `apps/api/urls.py`, `permissions.py`, `serializers.py`, `views.py`, `services.py`, `config/settings.py` e `requirements.txt`. |
| Escritas de origem | Alterados `apps/counting/ingestion.py`, `apps/counting/adjustments.py` e `apps/meals/services.py`. |
| Validação | Criado `apps/analytics/test_analytics.py`. |
| Documentação | Adicionados os oito guias abaixo e este relatório. Atualizados `README.md` e `API_ENDPOINTS.md`. |

## Entrega e integração

- [Projeção e fontes](DAILY_METRICS.md) e [arquitetura e serviços reutilizáveis para RealInova](ANALYTICS_ARCHITECTURE.md).
- [Fórmulas, valores ausentes e exemplos numéricos](ANALYTICS_FORMULAS.md).
- [Endpoints, exportações e integração React Native](REPORTING_API.md) e [histórico com intervalos e comparação](HISTORY_API.md).
- [Papéis e isolamento](ANALYTICS_PERMISSIONS.md) e [reconciliação e operação da fila](ANALYTICS_RECONCILIATION.md).
- [Comandos, evidências e desempenho](ANALYTICS_TESTS.md).

A validação foi local, com base PostgreSQL isolada e dados sintéticos. A implantação precisa aplicar a migração, agendar o reconciliador e, quando aplicável, enfileirar o histórico legado. A execução com o aplicativo móvel conectado, com câmeras de uma escola e com HTTPS no ambiente publicado permanece por verificar.
