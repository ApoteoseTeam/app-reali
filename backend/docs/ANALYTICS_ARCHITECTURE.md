# Arquitetura analítica

1. O Django recebe eventos aceitos de contagem, ajustes auditados ou transições de serviços de merenda. Na mesma transação, a camada de escrita atualiza uma fila durável por escola e data.
2. `analytics.services` bloqueia por escola, consolida fatos com o ORM, atualiza a projeção `DailyMetrics` e confirma a operação junto com a auditoria e o consumo da fila.
3. `analytics.selectors` fornece consultas por escola e fatos dos serviços. As contagens por serviço usam subconsultas agregadas com isolamento de escola. `analytics.reporting` monta períodos, compara escopos e soma as projeções em SQL.
4. As views validam os filtros e derivam as escolas dos vínculos do usuário. Os serializers expõem os mesmos cálculos em JSON. O exportador recebe os resultados já autorizados e gera os arquivos em memória.

A projeção usa a constraint escola/data e o índice de data. A fila usa a constraint escola/data e o índice de `queued_at`. A soma de entradas aproveita o índice câmera/ocorrência. As consultas de pratos e de ajustes reaproveitam os índices das Fases 4 e 5, inclusive o índice serviço/ocorrência para contagens de prato. A busca por tipo, status e data reaproveita `meal_history_scope_idx`.

O histórico operacional agrega projeções. Filtros de refeição exigem fatos por serviço e processam até 5.000 serviços por consulta, com somas de eventos em SQL. A comparação institucional pagina escolas antes de agregar. Exportações são limitadas a 90 dias.

Para a Fase 7, `day_scope`, `meal_rows`, `meal_metrics` e `report_rollups` podem ser reutilizados com um queryset de escolas previamente autorizado. A integração deve exigir uma instituição ativa, validar o papel e aplicar a restrição de entradas para professores. O planejamento inicial e a lógica do motor de previsão continuam nos serviços da Fase 5.
