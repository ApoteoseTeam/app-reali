# Backend Reali

Execute os comandos a partir da pasta `backend`. O ambiente foi validado com Python 3.14, Django 5.2 e PostgreSQL 18.

## Instalação local

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python manage.py check
python manage.py migrate --plan
python manage.py migrate
python manage.py runserver
```

Em Linux e macOS, ative o ambiente com `source .venv/bin/activate`. Para instalar apenas as dependências de execução, use `requirements.txt`.

Sem `POSTGRES_DB`, o modo de desenvolvimento usa `db.sqlite3`. Para usar PostgreSQL, crie previamente uma base local e um papel com acesso ao banco e permissão para criar as tabelas no schema. Para os testes com PostgreSQL, use um papel de desenvolvimento autorizado a criar o banco temporário de teste.

```powershell
$env:POSTGRES_DB = 'reali'
$env:POSTGRES_USER = 'reali'
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5432'
# Defina POSTGRES_PASSWORD no ambiente com a senha do papel.
python manage.py migrate --plan
python manage.py migrate
```

O Django lê variáveis exportadas no processo. Use [`.env.example`](.env.example) como referência. Revise o plano e faça backup antes de migrar uma base compartilhada. Em caso de erro de conexão, verifique o serviço, o host, a porta, a autenticação e as permissões do papel. O tempo limite de conexão é de cinco segundos.

## API e verificação

- API REST em `/api/v1/`. Consulte o [contrato das rotas](API_ENDPOINTS.md) e as [orientações para Android e iOS](MOBILE_REACT_NATIVE.md).
- Com `DJANGO_DEBUG=true`, abra `/api/docs/` para Swagger ou `/api/schema/` para OpenAPI.
- Use `python manage.py createsuperuser` para criar um operador interno de desenvolvimento. Consulte o [guia de autenticação e operação](docs/AUTHENTICATION.md) para provisionamento, permissões internas, SMTP e execução do worker de recuperação.
- Configure `REALI_ACTIVATION_URL`, `REALI_PASSWORD_RESET_URL` e SMTP com base em `.env.example`. A referência de endpoints da Fase 2 está no [contrato de autenticação e acesso](docs/API_AUTH_ENDPOINTS.md).
- Para câmeras e agentes, consulte [provisionamento](docs/EDGE_DEVICES.md), [heartbeat e retenção](docs/CAMERA_HEARTBEAT.md) e o [contrato HTTP](docs/CAMERA_API_ENDPOINTS.md).
- Para integrar as contagens, consulte o [guia da equipe de visão](docs/VISION_INTEGRATION.md), os [contratos](docs/DEVICE_COUNT_API.md) e os [testes de ingestão](docs/COUNTING_TESTS.md).
- Para programar refeições e integrar previsões, consulte [serviços de merenda](docs/MEAL_SERVICES.md), o [motor de previsão](docs/FORECAST_ENGINE.md) e o [contrato para React Native](docs/FORECAST_API.md).

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python manage.py test
python -m pytest -q
ruff check .
ruff format --check apps/api config/settings.py config/urls.py
python manage.py spectacular --validate --fail-on-warn --file schema.yaml
```

Os runners criam um banco de teste. A exportação de `schema.yaml` é opcional.

## Configuração de implantação

Defina explicitamente `DJANGO_DEBUG=false`, uma `DJANGO_SECRET_KEY` forte e exclusiva, `DJANGO_ALLOWED_HOSTS` e as variáveis PostgreSQL. Rode `python manage.py check --deploy` com essa configuração. Configure `POSTGRES_SSLMODE` de acordo com o servidor e o certificado. Execute `collectstatic` e sirva os estáticos pelo ambiente de implantação.

Configure TLS no proxy. Habilite `DJANGO_TRUST_PROXY_HTTPS` somente se o proxy substituir o cabeçalho de protocolo e for a única entrada do serviço. Ajuste `DJANGO_THROTTLE_NUM_PROXIES` conforme a topologia confiável, mantenha limites no proxy e use cache compartilhado caso os limites do DRF precisem valer entre workers. Configure `DJANGO_CSRF_TRUSTED_ORIGINS` para origens web confiáveis quando necessário. O backend atende requisições nativas com JWT. Para clientes web em outra origem, defina `DJANGO_CORS_ALLOWED_ORIGINS` com uma lista separada por vírgulas. Em desenvolvimento, o Expo local na porta 8081 já está permitido. HSTS depende da validação do domínio e do HTTPS.

Consulte a [auditoria da Fase 1](docs/AUDIT_REPORT.md) e o [relatório da Fase 2](docs/PHASE2_REPORT.md).

### Indicadores e relatórios

Após migrar, agende `python manage.py reconcile_daily_metrics` no ambiente de implantação. Consulte [operação e reprocessamento](docs/ANALYTICS_RECONCILIATION.md), [contratos para o app](docs/REPORTING_API.md) e [validação da Fase 6](docs/ANALYTICS_TESTS.md).

### RealInova

Instale as dependências, aplique as migrações e configure a conta do provedor para habilitar o chat. Agende `python manage.py prune_realinova` para aplicar retenção e recuperar execuções interrompidas. Consulte [provedores](docs/REALINOVA_PROVIDERS.md), [API](docs/REALINOVA_API.md) e [relatório da Fase 7](docs/PHASE7_REPORT.md).

### Notificações e operações administrativas

Aplique as migrações, configure os canais habilitados e agende `python manage.py process_notifications` no ambiente PostgreSQL. O Django atende a central mesmo sem provedor push. [Arquitetura](docs/NOTIFICATIONS_ARCHITECTURE.md) · [Agendamento](docs/NOTIFICATIONS_SCHEDULING.md) · [Relatório da Fase 9](docs/PHASE9_REPORT.md)

### Segurança e qualidade

O [relatório da Fase 10](docs/QUALITY_FINAL_REPORT.md) reúne resultados de segurança, integridade, cobertura e desempenho. Consulte o [pipeline](docs/CI_PIPELINE.md) e a [auditoria de configuração](docs/SECURITY_AUDIT.md).
