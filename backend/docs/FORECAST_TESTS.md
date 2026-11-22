# Testes da previsão e dos serviços

Execute em `backend` com o ambiente virtual e um PostgreSQL isolado. O papel de teste precisa conseguir criar o banco temporário do pytest.

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python -m pytest -q apps/meals
python -m pytest -q
ruff check .
python manage.py spectacular --validate --fail-on-warn --file schema.yaml
```

A suíte da Fase 5 cobre criação, sobreposição e exceções de programação, geração repetida, máquina de estados, cancelamento, autoria e isolamento. Também cobre ajustes de entrada, corte, disponibilidade temporal, séries de outras escolas, qualidade das câmeras, dados tardios, cálculo histórico, valores atípicos, fallback, taxa acima de 1, zero observado, imutabilidade e rollback. O teste concorrente em PostgreSQL usa duas requisições de preparo e exige um único snapshot, uma única previsão e o mesmo ID nas duas respostas. O teste de distribuição envia contagens pela API autenticada da Fase 4.

| Ambiente | Resultado da suíte completa |
|---|---|
| PostgreSQL 18 isolado | 55 aprovados. Um teste opcional de carga da Fase 4 ficou fora. |
| SQLite de teste | 48 aprovados. Sete testes de locks e um teste opcional de carga ficaram fora. |

A validação também aplicou `meals.0003` a uma cópia isolada da Fase 4. O snapshot histórico com 420 entradas e a previsão de 391 pratos mantiveram os IDs e valores. Repetir `start` para o serviço histórico devolveu os mesmos registros. O plano posterior ficou vazio. Django check, ausência de migrations pendentes nos models, Ruff e OpenAPI passaram. `check --deploy` apontou somente o aviso `security.W004` de HSTS.
