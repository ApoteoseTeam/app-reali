# Fórmulas analíticas

Para uma linha diária, um serviço ou um agregado em que ambos os totais estejam disponíveis, sejam `P` os pratos previstos e `S` os servidos.

| Campo | Fórmula |
| --- | --- |
| `forecast_difference` | `P - S`. Positivo indica previsão acima da distribuição. Negativo indica distribuição acima da previsão. |
| `absolute_error` | `abs(P - S)`, calculado sobre os totais da linha. |
| `percentage_error` | `abs(P - S) / S × 100` quando `S > 0`. |
| `sum_absolute_error` | Soma de `abs(Pᵢ - Sᵢ)` por serviço elegível para comparação. |
| `mae` | Soma dos erros absolutos dividida pelo número de serviços comparados. A unidade é pratos. |
| `wape` | Soma dos erros absolutos dividida pela soma dos pratos servidos **dos mesmos serviços comparados**, multiplicada por 100. |

Serviços comparáveis são os finalizados com qualidade de distribuição `COMPLETE` e com previsão e contagem disponíveis. Um serviço pode ter dois totais úteis para a operação antes de atender a esses critérios. Ajustes válidos alteram o total observado e os erros quando o indicador é reconciliado. Cada total agregado soma as observações disponíveis de sua fonte. Consulte a cobertura e o estado antes de comparar totais de períodos incompletos.

Se faltar um operando, desvio e erro absoluto são `null`. Percentuais retornam `null` com `INSUFFICIENT_DATA` quando faltam dados e com `ZERO_ACTUAL` quando o denominador é zero. O MAE continua definido se houver serviços comparados com distribuição conhecida igual a zero. Decimais são serializados como strings com duas casas, com arredondamento para o mais próximo e empates para cima.

## Exemplos reproduzíveis

| Serviço | Previsto | Servido | Desvio | Erro absoluto | Erro percentual |
| --- | ---: | ---: | ---: | ---: | ---: |
| Almoço | 10 | 16 | −6 | 6 | 37,50% |
| Lanche | 20 | 14 | 6 | 6 | 42,86% |
| Dia | 30 | 30 | 0 | 0 | 0,00% |

Com os dois serviços comparáveis, a soma dos erros é 12, o MAE é 6,00 pratos e o WAPE é 12 ÷ 30 × 100 = 40,00%. Para um único serviço comparável com previsão 7 e distribuição conhecida igual a zero, o desvio é 7, o MAE é 7,00 e os dois percentuais são nulos com `ZERO_ACTUAL`.

As diferenças são desvios de previsão. Os dados do Reali medem entradas e distribuição de pratos.
