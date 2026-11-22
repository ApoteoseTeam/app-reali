# Testes de desempenho

Em 20 de novembro de 2026, a medição usou Django e PostgreSQL 18 locais em Windows. Os agentes, as escolas, as contas e as cargas são sintéticos. RealInova usa o provedor HTTP local de teste, SMTP usa memória e os agentes da carga usam o contrato HTTP do backend.

```powershell
$env:REALI_RUN_COUNT_LOAD = "1"
$env:REALI_RUN_QUALITY_LOAD = "1"
python -m pytest -q -s apps/counting/test_load.py apps/api/test_phase10_performance.py
```

A carga de ingestão usou seis instalações concorrentes com eventos individuais, lotes e reenvios. Processou 180 requisições em 9,896 s, 18,19 req/s, 540 eventos entregues e 54,57 eventos/s. Persistiu 504 eventos únicos e contabilizou 36 reenvios, com zero erros. Latências p50/p95/p99 de 293,72/618,62/1.114,27 ms.

A carga de consultas usa quatro clientes, duas organizações, quatro escolas e 14 dias sintéticos por escola. Mede login, dashboard, histórico, consolidação, RealInova e processamento da fila de notificações. Os números servem como referência local de regressão.

| Cenário | Chamadas | p50 (ms) | p95 (ms) | p99 (ms) | Erros |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dashboard | 40 | 296,10 | 1.280,37 | 1.382,27 | 0 |
| Histórico diário | 40 | 207,69 | 511,05 | 644,03 | 0 |
| Login | 4 | 1.940,22 | 1.960,23 | 1.960,23 | 0 |
| Consolidação diária | 4 | 176,01 | 269,82 | 269,82 | 0 |
| RealInova com provedor local | 4 | 12.354,59 | 12.616,75 | 12.616,75 | 0 |

O ensaio misto executou 92 requisições a 4,24 req/s em 21,71 s, com quatro chamadas ao provedor de teste. O processo Python consumiu 20,78 s de CPU e atingiu 196,77 MiB de RSS amostrado. A chamada de dashboard instrumentada executou oito consultas em 65 ms de tempo SQL acumulado. O worker processou 24 entregas via SMTP em memória a 27,73 entregas/s.

O chat apresentou a maior latência no ensaio, seguido pelo login. O teste rodou junto de outras verificações no mesmo host e inclui inicialização do provedor, execução da aplicação e custo de hash de senha. A origem da latência de cada componente exige perfilamento dedicado. A primeira coleta mista parou na instrumentação porque a cópia local de `psutil` estava incompleta. A reinstalação do wheel e a execução seguinte concluíram a medição.

Os percentis de cenários com quatro chamadas são descritivos. CPU e RSS medem o processo Python que executa a aplicação de teste, incluindo o runtime e o executor. O tempo de SQL usa instrumentação Django em uma chamada autenticada de dashboard. CPU e memória do PostgreSQL, escala distribuída, fluxo Expo real e picos de produção permanecem sem medição por essa carga.
