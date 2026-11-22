# Reconciliação e dados atrasados

Contagens novas aceitas, ajustes auditados e mudanças de serviço enfileiram as datas afetadas em `PendingDailyMetrics` na mesma transação do fato. Reentregas idempotentes preservam o registro original. Uma alteração de horário que muda a data do serviço sinaliza a data anterior e a nova. A ingestão mantém a janela de atraso `COUNT_MAX_DELAY_SECONDS` da Fase 4.

O reconciliador adquire primeiro um bloqueio de chave na organização para a auditoria e então bloqueia a escola com `FOR NO KEY UPDATE` no PostgreSQL e bloqueia o par escola/data na fila antes de consultar as fontes. Um fato gravado durante o cálculo espera pela fila e sinaliza novamente o par após a consolidação. A projeção, a auditoria e a remoção da fila são transacionais. Uma falha preserva a fila e os dados previamente consolidados. As leituras apresentam `stale=true` enquanto há atualização pendente.

## Estados

- `PROVISIONAL` indica uma projeção em aberto.
- `COMPLETE` exige dia encerrado além da janela de atraso, entradas observadas, serviços operacionais finalizados com distribuição observada e câmeras ativas de ambos os tipos com agentes e câmeras online e filas zeradas.
- `REVISED` marca mudanças materiais em projeções já calculadas de dias anteriores. O campo `is_complete` informa se a versão revisada atende ao fechamento. O estado original continua auditável.
- `NO_DATA` é um estado da leitura agregada para ausência de evidência.

O fechamento comprova os critérios operacionais observáveis. Equipamento indisponível, perda de telemetria ou ausência de observações deixam o dia provisório. Alterações em `DailyMetrics` preservam os snapshots e previsões de preparo.

## Operação

Aplique as migrações no ambiente e agende o comando abaixo no scheduler de implantação, por exemplo a cada minuto. O limite padrão processa até 200 dias por execução. Execuções concorrentes serializam por escola. O comando também revisita dias provisórios recentes com entradas, pratos e serviços, dando intervalo de uma hora entre verificações de fechamento.

```powershell
python manage.py migrate
python manage.py reconcile_daily_metrics --limit 200
python manage.py reconcile_daily_metrics --from 2026-11-01 --to 2026-11-17 --school UUID --limit 200
```

Use `--from` e `--to` em conjunto para enfileirar períodos legados. Sem `--school`, o lote percorre escolas ativas. Cada operação aceita até 10.000 pares, e rodadas seguintes drenam o restante. A execução retorna erro quando uma consolidação falha, deixando o item disponível. Filas e logs identificam escola, dia e falha.

O endpoint administrativo aplica limite de 12 chamadas por hora e reaproveita uma projeção recalculada nos últimos 30 segundos quando a fila está limpa.
