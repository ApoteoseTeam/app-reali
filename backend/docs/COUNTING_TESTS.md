# Testes e desempenho das contagens

Execute no diretório `backend` com o ambiente virtual ativado. Use um banco PostgreSQL isolado e um papel capaz de criar o banco temporário do pytest.

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python -m pytest -q
ruff check .
python manage.py spectacular --validate --fail-on-warn --file schema.yaml
```

`apps/counting/test_counting.py` cobre autenticação, escopo de agente e câmera, validação dos dois tipos, janela real de refeições, idempotência unitária e em lote, rollback em falha de persistência, ajustes, reversões, consultas e snapshots. Os testes concorrentes dependem de PostgreSQL.

## Carga HTTP local reproduzível

```powershell
$env:REALI_RUN_COUNT_LOAD = '1'
python -m pytest -q -s apps/counting/test_load.py
Remove-Item Env:REALI_RUN_COUNT_LOAD
```

O teste usa o servidor Django em IPv4 de loopback sem proxy. São seis emissores concorrentes, um por escola, com portaria e cantina, 30 requisições por emissor, eventos unitários, lotes de quatro e retransmissões. Os dados são sintéticos. PostgreSQL 18 e cliente HTTP estiveram na mesma máquina.

| Medida | Resultado |
|---|---:|
| Requisições | 180 |
| Duração da carga | 6,695 s |
| Eventos confirmados | 540 |
| Novas gravações | 504 |
| Reenvios confirmados | 36 |
| Eventos confirmados por segundo | 80,66 |
| Novas gravações por segundo | 75,28 |
| Latência p50 | 199,84 ms |
| Latência p95 | 311,94 ms |
| Latência p99 | 474,97 ms |
| Requisições com erro | 0 de 180 |
| Linhas de contagem e de idempotência | 504 em cada |
| Contador de duplicados | 36 |

Esses resultados cobrem a carga e o banco isolado do teste. A capacidade com TLS, proxy e volumes históricos reais ainda precisa ser medida em homologação.
