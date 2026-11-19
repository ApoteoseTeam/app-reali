# API de relatórios e dashboard

Use o prefixo `/api/v1/analytics/`, o JWT do usuário e o cabeçalho `X-Organization-ID`. Passe o UUID em `school` para selecionar a unidade. Sem esse filtro, agregados usam as escolas autorizadas da instituição selecionada. As listas respondem com `count`, `next`, `previous` e `results` em páginas de 50.

| Método e caminho | Contrato |
| --- | --- |
| `GET daily/` | Projeções por escola e dia em ordem decrescente, com filtros de escola e data. Para papéis com acesso amplo, a omissão de datas mantém o histórico paginado anterior. |
| `GET daily/{id}/` | Projeção e erros, com `school` no formato UUID para compatibilidade. |
| `GET dashboard/` | Dia local atual por padrão. Aceita `date` e, para os papéis autorizados, filtros de refeição. Inclui até 50 serviços em horário programado. `meal_services_truncated` indica que a lista de serviços deve ser consultada. |
| `GET meal-services/` | Indicadores paginados com escola, data, tipo, status, horários, entradas do snapshot, método, previsão, distribuição e qualidade. |
| `GET meal-services/{id}/` | Indicadores do serviço selecionado. |
| `GET organizations/summary/` | Resultados do período e do intervalo imediatamente anterior de igual duração, com limites explícitos e diferenças entre totais conhecidos. Inclui contagem de serviços operacionais por tipo. |
| `GET schools/comparison/` | Uma linha por escola autorizada com totais, cobertura, erros e qualidade. Ordenação por UUID, sem ranking. |
| `GET reports/export/` | `file_format=csv\|pdf` ou alias `format`. O formato padrão é CSV. `group=daily\|weekly\|monthly`. |
| `POST daily/rebuild/` | Recebe `{"school":"UUID","date":"2026-11-17"}` e retorna a projeção atualizada. `POST rebuild/` preserva o contrato anterior. |

Exemplos de integração no React Native:

- Início usa `GET dashboard/?school=UUID` e mostra `data_status`, `stale`, `calculated_at` e a lista de serviços.
- Relatório Diário seleciona `date` no dashboard e em `meal-services/`. O app pode abrir um serviço pelo UUID.
- Histórico usa `history/` e segue `next`. Visão Institucional combina `organizations/summary/`, `schools/comparison/` e o histórico institucional sem informar `school`.
- Preserve `null` como indisponibilidade. Renderize `0` como zero observado e as strings decimais de acordo com a localidade. Use os valores retornados para gráficos e relatórios.

Exemplo de dashboard com cobertura ainda provisória:

```json
{
  "school_id": "f6f46dc4-1683-4d1f-830a-fa5c2e517d6f",
  "reference_date": "2026-11-17",
  "total_student_entries": 24,
  "total_forecast_plates": 30,
  "total_served_plates": 30,
  "forecast_difference": 0,
  "absolute_error": 0,
  "percentage_error": "0.00",
  "percentage_error_reason": null,
  "compared_services": 2,
  "sum_absolute_error": 12,
  "mae": "6.00",
  "wape": "40.00",
  "wape_reason": null,
  "coverage": 1,
  "expected": 1,
  "data_status": "PROVISIONAL",
  "stale": false,
  "calculated_at": "2026-11-17T16:00:00-03:00",
  "meal_services": [
    {
      "id": "965fdce1-890a-4f96-ac82-45da54534313",
      "school_id": "f6f46dc4-1683-4d1f-830a-fa5c2e517d6f",
      "reference_date": "2026-11-17",
      "meal_type": "LUNCH",
      "status": "FINISHED",
      "preparation_started_at": "2026-11-17T10:30:00-03:00",
      "serving_started_at": "2026-11-17T12:00:00-03:00",
      "finished_at": "2026-11-17T13:00:00-03:00",
      "snapshot_entries": 24,
      "total_forecast_plates": 10,
      "total_served_plates": 16,
      "forecast_method": "CONFIGURED_RATE",
      "data_quality": "COMPLETE",
      "comparison_eligible": true,
      "forecast_difference": -6,
      "absolute_error": 6,
      "percentage_error": "37.50",
      "percentage_error_reason": null
    },
    {
      "id": "01a94c60-f14d-43c9-a375-822fb7a08e38",
      "school_id": "f6f46dc4-1683-4d1f-830a-fa5c2e517d6f",
      "reference_date": "2026-11-17",
      "meal_type": "SNACK",
      "status": "FINISHED",
      "preparation_started_at": "2026-11-17T14:00:00-03:00",
      "serving_started_at": "2026-11-17T15:00:00-03:00",
      "finished_at": "2026-11-17T15:30:00-03:00",
      "snapshot_entries": 24,
      "total_forecast_plates": 20,
      "total_served_plates": 14,
      "forecast_method": "CONFIGURED_RATE",
      "data_quality": "COMPLETE",
      "comparison_eligible": true,
      "forecast_difference": 6,
      "absolute_error": 6,
      "percentage_error": "42.86",
      "percentage_error_reason": null
    }
  ],
  "meal_services_truncated": false
}
```

## Arquivos

A exportação aceita até 90 dias inclusivos, com limite de 20 requisições por usuário por hora. O CSV tem UTF-8 com BOM, vírgula como separador e campos desconhecidos em branco. O PDF registra instituição, unidade ou escopo, período, geração e qualidade por linha, além de indicar quando o intervalo está sem dados. Os relatórios são anexos privados com `Cache-Control: private, no-store` e registram auditoria ao serem gerados. A resposta é gerada em memória e entregue na mesma chamada.
