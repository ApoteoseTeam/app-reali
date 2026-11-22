# Validação da Fase 6

## Como reproduzir

Execute no diretório `backend` com as dependências de desenvolvimento instaladas. Configure `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER` e `POSTGRES_PASSWORD` para um ambiente isolado. O usuário de teste precisa poder criar o banco que o Django usa durante a suíte.

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python manage.py spectacular --file openapi.yml --validate --fail-on-warn
python -m pytest -q --tb=short
python -m pytest -q -s apps/analytics/test_analytics.py -k query_budget
$env:REALI_RUN_COUNT_LOAD = "1"
python -m pytest -q -s apps/counting/test_load.py
```

A cobertura percorre fórmulas e ausência de dados, recálculo idempotente, saldos corrigidos para zero, qualidade dos dispositivos, revisão auditada, snapshots imutáveis, falha transacional, consolidação concorrente, ingestão durante o cálculo, ajuste concorrente, escopo institucional, bloqueio de papéis, paginação, agrupamento, reprocessamento e exportações.

## Resultados locais

| Validação | Resultado |
| --- | --- |
| PostgreSQL 18.6, suíte completa com carga HTTP | 68 passaram em 173,77 s. Os dois testes acrescentados após a coleta da suíte passaram em uma rodada focada. |
| SQLite | 58 passaram e 10 foram pulados na suíte completa. Na rodada focada dos dois testes adicionais, um passou e o teste dependente de bloqueios PostgreSQL foi pulado. |
| Django e migrações | `check` sem problemas e `makemigrations --check` sem alterações. A migração foi aplicada em PostgreSQL e o plano ficou vazio. Uma rodada isolada de reversão e reaplicação confirmou a preservação do UUID e dos totais de uma projeção legada. |
| Ruff e Git | Análise estática e verificação do diff concluídas sem erros. |

## Medições

Uma execução local no PostgreSQL com 5.000 eventos brutos, 361 projeções e 13 escolas mediu 19 comandos SQL e 96,9 ms para recalcular um dia. A leitura do histórico diário institucional de 30 dias executou quatro comandos SQL e levou 26,8 ms. Os números são de uma execução com dados sintéticos e incluem o acesso local ao Django. A suíte impõe limites de comandos SQL, e registra o tempo observado.

A carga HTTP de regressão percorreu seis escolas em 180 requisições. Entregou 540 eventos, com 504 gravados, 36 reentregas idempotentes e zero erros. O tempo observado foi 7,386 s e a latência p95 por requisição foi 322,93 ms.

O PDF foi extraído com pypdf e renderizado com PyMuPDF a partir da resposta do endpoint. O caso de 78 dias gerou quatro páginas com o cabeçalho repetido, acentuação preservada e identificação de dados provisórios. Um segundo PDF confirmou o estado sem dados. O CSV foi lido com BOM UTF-8 e seus totais foram conferidos.

O schema OpenAPI foi validado sem avisos e expõe paginação nas listas e os dois tipos MIME da exportação. O executável Postman disponível retornou `unknown command 'status'`. Os testes de contrato usaram o cliente DRF e o schema gerado pelo projeto.

`check --deploy`, com `DEBUG=false` no ambiente local, emitiu `security.W004` para HSTS ausente. A validação de produção depende da configuração TLS da implantação.
