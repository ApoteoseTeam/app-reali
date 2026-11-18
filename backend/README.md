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
- Use `python manage.py createsuperuser` para criar um operador do Django Admin. O provisionamento institucional ainda requer intervenção da equipe.
- Use `REALI_ACTIVATION_URL` e as variáveis SMTP de `.env.example` antes de emitir convites. No desenvolvimento, um transporte local de e-mail permite inspecionar mensagens com contas de teste.

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

Configure TLS no proxy. Habilite `DJANGO_TRUST_PROXY_HTTPS` somente se o proxy substituir o cabeçalho de protocolo e for a única entrada do serviço. Ajuste `DJANGO_THROTTLE_NUM_PROXIES` conforme a topologia confiável, mantenha limites no proxy e use cache compartilhado caso os limites do DRF precisem valer entre workers. Configure `DJANGO_CSRF_TRUSTED_ORIGINS` para origens web confiáveis quando necessário. O backend atende requisições nativas com JWT. Para uma implantação web, use a mesma origem ou configure uma lista explícita de origens no componente que aplicar a política CORS. HSTS depende da validação do domínio e do HTTPS.

Consulte o [relatório de auditoria](docs/AUDIT_REPORT.md) para arquitetura, riscos e pendências.
