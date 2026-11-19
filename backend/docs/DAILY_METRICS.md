# Indicadores diários

`DailyMetrics` é a projeção persistida por escola e data de referência. Mantém o UUID, as datas de criação e atualização e a constraint `uq_daily_metrics_school_day`. O recálculo substitui os valores derivados na mesma linha e registra `calculated_at`.

| Campo | Fonte ou significado |
| --- | --- |
| `total_student_entries` | `StudentCount` e ajustes de entrada com ocorrência no dia local da escola, usando o fuso configurado no Django. Inclui fontes automáticas e manuais legadas. |
| `total_forecast_plates` | Uma previsão operacional original por `MealService` do dia, excluídos os serviços cancelados. A previsão é um vínculo um-para-um com o serviço. |
| `total_served_plates` | `PlateCount` e ajustes de prato com ocorrência no dia local. A câmera e o serviço devem pertencer à escola consolidada. |
| `has_entries`, `has_forecast`, `has_served` | Sinalizam se houve evidência de cada fonte. A API retorna `null` quando a fonte não foi observada e pode retornar zero quando, por exemplo, uma correção anulou a quantidade original. |
| `compared_services`, `sum_absolute_error`, `compared_served` | Componentes das estatísticas de previsão. A projeção também guarda `eligible_services`, a contagem de serviços existentes sem cancelados, usada para revisitar dias em aberto. |
| `is_complete`, `data_status`, `stale` | Fechamento, estado da projeção e existência de recálculo pendente. `stale` é derivado da fila na leitura. |

O total diário conta eventos de entrada diretamente. Um aluno pode gerar mais de uma entrada. Os snapshots preservam as entradas consideradas no momento de cada preparo.

Uma refeição usa as contagens associadas ao seu UUID, enquanto o agregado diário usa a ocorrência local das contagens. Em dados legados que cruzam a meia-noite, os dois agrupamentos podem divergir. A ingestão da Fase 4 valida a data das novas contagens de prato. O histórico filtrado por tipo ou status adota a data do serviço.

A migração preserva totais de projeções existentes, com disponibilidade de origem desconhecida. A primeira reconciliação do período recalcula esses totais e determina quais fontes têm evidência.
