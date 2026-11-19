# Relatório da Fase 5

O fluxo de planejamento usa os registros da Fase 4 e registra o raciocínio do cálculo em dados reproduzíveis. O backend preserva o resultado do primeiro início de preparo e a distribuição continua habilitando a ingestão de pratos vinculada ao serviço.

## Implementação

- `MealService`, `AttendanceSnapshot` e `MealForecast` receberam campos aditivos. Foram criados `MealSchedule` e `MealForecastPolicy`. A migration `meals.0003_mealforecastpolicy_mealschedule_and_more` conserva os valores legados, com método `LEGACY_RATE`.
- `apps/meals/services.py` aplica escopo institucional, horários, geração, estados e auditoria. `forecasting.py` congela a janela e calcula uma taxa decimal ponderada. O histórico exige evidência operacional e disponibilidade até o corte. A taxa inicial é configurada explicitamente.
- `apps/meals/views.py` e `serializers.py` preservam as rotas existentes e acrescentam programação, política, snapshots, cancelamento e lista de previsões. O resumo de contagem da Fase 4 fornece os componentes da janela. A reconstrução vigente de indicadores deixa de somar previsões canceladas.

## Achados e decisões de compatibilidade

O fluxo anterior somava entradas desde a meia-noite e aplicava uma taxa implícita de 1,000. Agora a janela é configurável por serviço ou programação. Serviços existentes com janela vazia usam o início da data local. Os campos legados permanecem nas respostas. Em uma previsão sem evidência ou taxa aplicável, pratos e taxa retornam `null` com motivo explícito. A taxa enviada no início exige direção ou gestão.

A repetição de `start` em `PREPARING` devolve os dados fixados. O histórico de previsão fica restrito à própria escola. Programações recorrentes são materializadas por ação explícita, com unicidade por programação e data. Revisão de previsão já emitida permanece fora do fluxo operacional.

## Evidências

| Estado | Verificação | Resultado |
|---|---|---|
| Validado | Programação e estados | Horários, turnos adjacentes, exceções, geração repetida, início, distribuição, finalização e cancelamento auditado. |
| Validado | Snapshot e previsão | Isolamento, janela, ajuste, atraso, qualidade, fallback, cálculo reproduzível, exclusão de dados futuros e imutabilidade. |
| Validado | PostgreSQL e SQLite | 55 e 48 testes aprovados, respectivamente. Concorrência em PostgreSQL validada. Consulte [testes e comandos](FORECAST_TESTS.md). |
| Validado | Ingestão de pratos | Contagens em distribuição e chegada tardia após finalização pelo token de dispositivo da Fase 4. |
| Validado | Migração e contrato | Cópia isolada da Fase 4 atualizada, previsão antiga preservada, plano posterior vazio, OpenAPI e Ruff aprovados. |
| Validado com ressalva | Configuração de implantação | Aviso `security.W004` de HSTS. |
| Não verificado | Ambiente real | Dados e câmeras de escolas reais, consumo pelo aplicativo React Native e configuração de implantação. |
| Não verificado | Postman CLI | O CLI instalado rejeitou `postman status`. A API foi exercitada com o cliente DRF e OpenAPI foi validado pelo Django. |

A Fase 6 pode usar snapshots, previsões registradas, pratos e ajustes para consolidar indicadores. A divergência entre previsto e servido é uma medida de planejamento.
