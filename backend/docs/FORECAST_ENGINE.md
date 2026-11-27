# Motor de previsão de pratos

A versão `reali-meal-v1` usa aritmética decimal. A taxa é arredondada para três casas com `ROUND_HALF_UP`, depois o produto entradas × taxa é arredondado ao prato inteiro com a mesma regra. Com 420 entradas e taxa medida ou configurada de `0.930`, `420 × 0.930 = 390.600` produz 391 pratos. Com 10 entradas e taxa `1.250`, o resultado é 13. A taxa é um fator empírico entre passagens e pratos entregues.

## Histórico elegível

A taxa ponderada é `soma_pratos / soma_entradas`. Cada amostra tem escola atual, mesmo tipo, mesmos horários planejados de distribuição e início de janela equivalente. Use apenas datas anteriores à do serviço atual e dentro do horizonte. É necessário encerramento disponível até o corte, snapshot positivo com cobertura completa, cobertura completa na cantina ao encerrar e pelo menos um registro automático de prato disponível na janela real de distribuição. Pratos e ajustes recebidos depois do corte da previsão ficam fora. A consulta usa somente dados da escola atual.

O motor examina até 60 candidatos recentes para escolher até 30 amostras comparáveis. A duração da janela admite diferença de até uma hora. Exclua serviços excepcionais usando `history_excluded` enquanto planejados. A regra descarta fatores fora de 0 a 5. Com pelo menos cinco amostras elegíveis e mediana positiva, a regra também descarta fatores fora da mediana dividida e multiplicada por três. O mínimo é avaliado após os descartes. Distribuições sem registro automático e snapshots legados sem qualidade medida ficam fora do ajuste da taxa.

## Ordem de seleção

1. Taxa explícita do início, se o gestor fizer a operação autorizada.
2. Taxa histórica da escola, se houver amostra suficiente.
3. Taxa inicial configurada pelo gestor para escola e tipo.
4. Resultado `UNAVAILABLE`, com pratos e taxa em `null`.

A política padrão procura três serviços em 90 dias, com configuração por escola e tipo. Pode-se ajustar o mínimo de 2 a 30 e o horizonte de 7 a 365 dias. A taxa explícita ou configurada admite 0 a 5. Estimativas exigem dados de entrada disponíveis ou cobertura suficiente para um zero observado. Sem dados disponíveis, o resultado fica indisponível mesmo se existir uma taxa cadastrada.

`SUFFICIENT` indica taxa histórica com cobertura completa no snapshot atual. `PRELIMINARY` identifica taxa inicial, explícita ou histórico usado com cobertura parcial ou desatualizada. `INSUFFICIENT` acompanha indisponibilidade. A previsão grava método, confiança, versão, arredondamento, política, corte via snapshot e totais de cada amostra usada. A migração preserva as previsões antigas como `LEGACY_RATE` e `legacy-v1`. A diferença entre previsto e servido mede divergência de planejamento.
