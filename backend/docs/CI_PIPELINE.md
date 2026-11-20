# Pipeline de qualidade

O workflow `.github/workflows/quality.yml` dispara em pull requests, pushes para `main` e execução manual. Há jobs independentes de backend, frontend e segurança. Todas as actions externas referenciadas pelo workflow usam revisões fixadas.

- Backend instala as dependências, provisiona PostgreSQL 18, verifica Django, Ruff, migrações e OpenAPI e roda pytest com cobertura. O artefato junta JUnit, XML de cobertura e schema. A carga sintética é opcional na execução manual.
- Frontend executa `npm ci`, lint, TypeScript, testes/coverage do cliente e Expo Doctor com Node 24.
- Segurança executa pip-audit e npm audit, Bandit para achados com severidade e confiança médias ou superiores e Gitleaks sobre o histórico disponível no checkout. O workflow usa permissão de leitura e credenciais descartáveis restritas ao PostgreSQL do job.

A sintaxe e as expressões passaram no actionlint 1.7.12. As verificações equivalentes foram exercitadas localmente. A execução em runner GitHub aguarda publicação da mudança e configuração das regras exigidas no repositório. Nenhum job publica ou implanta a aplicação. [Serviço PostgreSQL no GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

Os comandos de verificação da fase foram `ruff check .`, `python manage.py check`, `check --deploy`, `makemigrations --check --dry-run`, `migrate --plan`, `migrate --noinput`, `spectacular --validate --fail-on-warn`, `python -m pytest --cov`, `python -m pip_audit --strict -r requirements.txt`, `npm audit --audit-level=moderate`, `bandit` e `gitleaks git --redact=100`. Os passos do workflow especificam o diretório e as flags para cada comando.
