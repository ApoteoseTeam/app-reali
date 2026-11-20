# Validação do RealInova

## Execução local

Use PostgreSQL isolado e instale as dependências de desenvolvimento. Configure as variáveis PostgreSQL do projeto antes dos comandos abaixo. Os testes usam fixtures sintéticas e um provedor HTTP controlado.

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python manage.py spectacular --file openapi.yml --validate --fail-on-warn
python -m pytest -q apps/ai/test_real_inova.py
$env:REALI_RUN_COUNT_LOAD = "1"
python -m pytest -q
```

A suíte passa pelo JWT do projeto, pelas rotas do DRF, pelas ferramentas Django e por um Agno Agent real com o SDK de Chat Completions. O provedor simulado devolve chamadas de ferramentas, escolhas de resposta e tokens conhecidos. Há cenários de falha 401, 429 e 500, timeout, fallback explícito, consumo ausente, adulteração de escopo, referências fabricadas e instruções maliciosas armazenadas em nomes e notas. A concorrência de idempotência usa PostgreSQL.

A coleção de avaliação verifica campos e fontes para pratos servidos, previsão do almoço, desvio, erro absoluto, maior desvio diário e dados ausentes. Inclui explicações para presença individual, desperdício e WAPE. O provedor simulado seleciona os passos a serem exercitados. A avaliação demonstra a fundamentação dos números e as salvaguardas do Django nesse cenário. A qualidade de interpretação, as taxas de escolha de ferramenta e a latência em um modelo hospedado dependem de avaliação com a conta aprovada.

## Resultados

| Validação | Evidência |
| --- | --- |
| PostgreSQL 18.6, suíte completa | 93 testes passaram em 217,28 s, com a regressão de ingestão HTTP habilitada. |
| PostgreSQL 18.6, última rodada do RealInova | 24 passaram em 35,04 s, incluindo planejamento e reenvio concorrente. |
| SQLite, rodada do RealInova | 23 passaram. O cenário de bloqueios da idempotência requer PostgreSQL e foi pulado. |
| Django e migração | `check` sem problemas, `makemigrations --check` sem mudanças e a migração inicial foi aplicada. O plano posterior ficou vazio. |
| Contrato e código | OpenAPI validado sem avisos, Ruff aprovado, exemplos JSON e contexto YAML lidos com sucesso. |
| Perfil de implantação local | `check --deploy` apontou `security.W004` para HSTS ausente. |

A compatibilidade e o custo do provedor contratado permanecem sem medição, pois o ambiente de teste não possui credencial do provedor. A validação no aplicativo Expo e no HTTPS publicado também depende do ambiente de implantação.

## Simulação Postman

Na raiz do repositório, execute:

```powershell
postman simulation run postman/simulations/realinova/realinova.sim.yaml --port 55449 --no-history --output ndjson
```

Use apenas dados sintéticos nesse cenário, pois a CLI imprime os corpos das requisições. Com o Django de desenvolvimento, use `REALINOVA_PROVIDER=openai_compatible`, `REALINOVA_BASE_URL=http://127.0.0.1:55449/llm/v1`, uma chave sintética e tarifas de teste. O modelo `fixture-report` chama a ferramenta de pratos servidos para a data recebida no contexto e `fixture-unavailable` simula 503. Consulte [o cenário e seus pressupostos](../../postman/simulations/realinova/realinova.context.yaml).

A simulação local observada devolveu 375 pratos e a data correta a partir de uma projeção sintética. O turno durou 2.265 ms em uma execução local, com duas chamadas HTTP, 60 tokens de entrada e 18 de saída declarados pelo cenário. Com tarifas fictícias de US$ 1 e US$ 2 por milhão de tokens, o registro contabilizou 96 µUSD. O cenário de indisponibilidade durou 100 ms, com uma chamada e retorno HTTP 503. Na última repetição local, o turno bem-sucedido levou 7.211 ms e a falha levou 115 ms, com os mesmos tokens declarados. Essas observações pontuais incluem a inicialização local e usam tarifas sintéticas.
