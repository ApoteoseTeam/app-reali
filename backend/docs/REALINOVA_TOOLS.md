# Ferramentas do RealInova

| Ferramenta | Dados retornados | Serviços reutilizados |
| --- | --- | --- |
| `get_student_counts` | Entradas, período e cobertura. Estado de atualização quando autorizado. | `analytics.reporting.report_rollups` e `DailyMetrics`. |
| `get_plate_counts` | Pratos servidos no intervalo, por tipo ou pelo UUID do serviço. | `report_rollups`, `filtered_meals` e `meal_metrics`. |
| `get_meal_forecasts` | Previsão operacional original, método, confiança e snapshot de referência. | `filtered_meals` e `meal_metrics`, com os modelos da Fase 5. |
| `get_daily_metrics` | Totais consolidados, desvios, erros, cobertura e atualização. | `report_rollups`. |
| `get_meal_service_metrics` | Entradas do snapshot, pratos previstos e servidos, erro, estado e qualidade por serviço. | `filtered_meals` e `meal_metrics`. |
| `compare_periods` | Dois intervalos para o mesmo indicador, valores, variação com sinal, magnitude e percentual quando a base é diferente de zero. | `report_rollups` e `analytics.selectors.percent`. |
| `get_school_performance` | Evolução, maiores erros absolutos ou grupos incompletos, com quantidade de serviços comparados, MAE e WAPE. | `report_rollups`. |
| `compare_schools` | Cobertura, volume e desempenho das escolas autorizadas, por páginas de oito. | `report_rollups` por escola. |

Os intervalos são inclusivos em `AAAA-MM-DD`. Sem datas, a consulta usa o dia atual no fuso configurado no Django. O teto é de 93 dias por consulta, com janela dos últimos 30 dias para COOK e TEACHER. A semana começa na segunda-feira. O UUID informado ao modelo é validado por objeto, e consulta por UUID de serviço permanece limitada às escolas e às datas selecionadas.

As listas para o modelo têm até oito resultados. A resposta indica truncamento. O filtro por tipo segue as regras da Fase 6, incluindo suas restrições de volume. A variação percentual entre intervalos usa a magnitude do valor anterior no denominador. Para comparações entre escolas, confira o volume, a cobertura e os serviços comparados antes de interpretar diferenças.
