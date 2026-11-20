# Validação de indicadores

As suítes verificam entradas, previsão, pratos servidos, diferença com sinal, erro absoluto e soma dos erros absolutos por serviço, MAE e WAPE. Ausência de evidência é representada explicitamente. As divisões verificam denominador disponível e positivo. Diferenças de distribuição representam uma comparação operacional de previsão.

`apps/analytics/test_analytics.py` cobre contagens corrigidas, adesão à cobertura operacional, escopo escolar, múltiplos serviços, cancelamento, agregação semanal e mensal, paginação, exportação, lacunas, eventos tardios, recálculo concorrente, rollback e orçamento de consultas. No fluxo HTTP da fase, 22 pratos foram consolidados e apareceram no CSV de teste com o cabeçalho de cache privado.

O evento que chega durante a reconciliação deixa a tarefa elegível para reprocessamento. O timestamp inicial da pendência é preservado para alertas, e os snapshots originais continuam disponíveis. [Reconciliação](ANALYTICS_RECONCILIATION.md)
