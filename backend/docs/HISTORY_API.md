# API de histórico

`GET /api/v1/analytics/history/` aceita `group=daily`, `weekly` ou `monthly`. Os caminhos `history/daily/`, `history/weekly/` e `history/monthly/` fixam o agrupamento. O início da semana é segunda-feira e o do mês é o dia 1. O rótulo identifica o início do grupo, mesmo quando a consulta começa no meio da semana ou do mês. As linhas seguem ordem cronológica.

- Use `start_date` e `end_date` inclusivos ou `date` para um dia. O padrão é até hoje, cobrindo 30 dias. O intervalo pode ter até 366 dias, a partir de 1900, e precisa terminar até o dia atual local.
- Selecione a organização com `X-Organization-ID` e uma escola autorizada com `school`. O JWT só pode acessar vínculos e escolas autorizados.
- `meal_type` aceita `BREAKFAST`, `LUNCH`, `SNACK` e `DINNER`. `status` usa os códigos de `MealService`. Com filtros de serviço, as somas consideram os serviços correspondentes e a contagem de entradas fica `null`. A cobertura passa a contar serviços correspondentes. Serviços cancelados são visíveis na consulta de serviço e excluídos dos totais filtrados.
- Sem filtros de serviço, `expected` é o número de escolas-dia abrangidas e `coverage` conta projeções com alguma evidência, incluindo projeções legadas até seu recálculo. Datas sem evidência permanecem na série com totais nulos. Um agregado com cobertura parcial pode apresentar totais parciais.
- `NO_DATA` indica ausência de evidência, inclusive dias sem operação. `PROVISIONAL` indica cobertura em aberto ou incompleta. `COMPLETE` e `REVISED` em agregados exigem fechamento de todos os dias no escopo. Com dados pendentes em algum dia, `stale` fica verdadeiro. `calculated_at` é o cálculo mais recente entre as projeções selecionadas.
- `organizations/summary/` compara com os mesmos filtros no intervalo imediatamente anterior. O delta usa o total do período consultado menos o do anterior e fica nulo quando falta algum valor. Para desdobrar por tipo, consulte o histórico por `meal_type`. Os campos de MAE, WAPE e serviços comparados permitem construir séries de erro.

Exemplo de resposta sem observações para uma escola e um dia:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "date": "2026-11-17",
      "total_student_entries": null,
      "total_forecast_plates": null,
      "total_served_plates": null,
      "forecast_difference": null,
      "absolute_error": null,
      "percentage_error": null,
      "percentage_error_reason": "INSUFFICIENT_DATA",
      "compared_services": 0,
      "sum_absolute_error": null,
      "mae": null,
      "wape": null,
      "wape_reason": "INSUFFICIENT_DATA",
      "coverage": 0,
      "expected": 1,
      "data_status": "NO_DATA",
      "calculated_at": null,
      "stale": false
    }
  ]
}
```
