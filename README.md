# Reali

O Reali apoia o planejamento e o acompanhamento da alimentação escolar. A interface reúne fluxos para gestão e cozinha, como consulta de cardápios, registro da produção e visualização de indicadores. O backend organiza o acesso por instituição e escola, recebe contagens de dispositivos e disponibiliza previsões, relatórios e notificações. O chat RealInova é uma integração opcional.

## Estrutura do projeto

| Pasta ou arquivo | Responsabilidade |
| --- | --- |
| `frontend/` | Aplicativo Expo SDK 58 com React Native, TypeScript e suporte à web via React Native Web. |
| `frontend/src/` | Telas, componentes, cliente REST, gerenciamento de sessão e serviços do aplicativo. |
| `frontend/app.json` e `frontend/eas.json` | Configuração do app e perfis de compilação Expo. |
| `backend/` | Django 5.2, Django REST Framework, autenticação JWT e regras de negócio. |
| `backend/apps/` e `backend/config/` | Módulos Django, configuração do servidor e roteamento. |
| `backend/docs/` | Contratos de integração e guias de operação. |

O frontend consome a API em `/api/v1/`. O Django usa SQLite por padrão em desenvolvimento e aceita PostgreSQL configurado por variáveis de ambiente.

## Executar localmente

Os comandos abaixo usam PowerShell. Instale Git, Node.js 24 com npm e Python 3.14. Para rodar no navegador, use dois terminais e mantenha os dois processos abertos.

### 1. Clonar o projeto

Se você já tem o repositório, abra a pasta dele e siga para o backend.

```powershell
git clone https://github.com/ApoteoseTeam/app-reali.git
cd app-reali
```

### 2. Iniciar o backend

No primeiro terminal, partindo da raiz:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:DJANGO_DEBUG = 'true'
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Em Linux ou macOS, use `./.venv/bin/python` e `export DJANGO_DEBUG=true`. Com `POSTGRES_DB` ausente no ambiente, o Django cria o banco local `backend/db.sqlite3`. As configurações são lidas do ambiente do processo. Use o [exemplo de variáveis](backend/.env.example) como referência.

| Endereço local | Uso |
| --- | --- |
| [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/) | Swagger no modo de desenvolvimento. |
| [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/) | Esquema OpenAPI no modo de desenvolvimento. |
| [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) | Administração do Django. |

### 3. Iniciar o frontend

No segundo terminal, partindo da raiz:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run web
```

Se `.env.local` já existir, preserve o arquivo e confira se `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1` corresponde ao backend local. Abra o endereço mostrado pelo Expo, normalmente [http://localhost:8081](http://localhost:8081). Reinicie o Expo ao alterar a URL da API.

### 4. Preparar acesso e dados

As contas institucionais são provisionadas por convite. Em um banco vazio, crie um operador local em outro terminal, a partir de `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py createsuperuser
```

Use esse operador para o fluxo administrativo. Para testar o aplicativo, provisione uma instituição, uma escola e uma conta institucional com o vínculo e o papel que você quer testar. O fluxo de convite usa `REALI_ACTIVATION_URL` e configuração de e-mail. O [guia de autenticação](backend/docs/AUTHENTICATION.md) detalha permissões, provisionamento, ativação e recuperação de senha.

### Usar PostgreSQL em desenvolvimento

Crie previamente a base e um usuário com permissão para criar tabelas no schema. No terminal do Django, configure as variáveis abaixo e exporte `POSTGRES_PASSWORD` com a senha do usuário do banco.

```powershell
$env:POSTGRES_DB = 'reali'
$env:POSTGRES_USER = 'reali'
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_PORT = '5432'
.\.venv\Scripts\python.exe manage.py migrate --plan
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

## Android

### Rodar em um emulador durante o desenvolvimento

Com o Android SDK, um JDK compatível e um emulador configurados, ajuste `EXPO_PUBLIC_API_URL` em `frontend/.env.local` para `http://10.0.2.2:8000/api/v1`. Esse endereço permite ao emulador padrão do Android alcançar o backend na máquina de desenvolvimento. Acrescente `10.0.2.2` aos hosts permitidos e reinicie o backend no terminal dele:

```powershell
$env:DJANGO_ALLOWED_HOSTS = 'localhost,127.0.0.1,10.0.2.2'
.\.venv\Scripts\python.exe manage.py runserver
```

No terminal do frontend, com o emulador aberto, rode `npm run android`. Para um dispositivo físico conectado à mesma rede, use o IP local do computador na URL da API, inclua esse IP em `DJANGO_ALLOWED_HOSTS` e inicie o Django com `manage.py runserver 0.0.0.0:8000`. O aparelho precisa conseguir alcançar a porta 8000. Consulte o [guia de integração mobile](backend/MOBILE_REACT_NATIVE.md).

### Gerar um APK para instalar no celular

O perfil `preview` em [eas.json](frontend/eas.json) usa distribuição interna, que gera um APK para instalação direta. Confira estes pontos antes do build:

1. Restaure os arquivos de ícone, splash e favicon que o [app.json](frontend/app.json) referencia em `frontend/assets/` ou ajuste as referências para imagens compatíveis. Essa pasta está ausente no checkout atual. A mesma dependência de imagens vale para a compilação nativa local.
2. Entre com uma conta Expo com acesso ao projeto EAS identificado por `extra.eas.projectId` no `app.json`.
3. No ambiente EAS `preview`, defina `EXPO_PUBLIC_API_URL` como a URL HTTPS do backend com o caminho `/api/v1`. O endereço precisa estar acessível pelo celular. O app exige HTTPS nas compilações de release e incorpora essa URL no pacote. Mantenha credenciais no ambiente do backend.

Em `frontend/`, execute:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Ao concluir, o EAS exibe o link do build. Abra o link no celular, baixe o APK e autorize a instalação pela origem usada se o Android solicitar. Para a Google Play, o perfil `production` gera um AAB. [Guia de APK do Expo](https://docs.expo.dev/build-reference/apk/) · [Variáveis de ambiente do EAS](https://docs.expo.dev/eas/environment-variables/usage/)

## Validação

No backend, em `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\ruff.exe check .
```

No frontend, em `frontend/`:

```powershell
npx tsc --noEmit
```

No checkout atual, a checagem TypeScript aponta diferenças de maiúsculas e minúsculas nos imports de Header, Select, Progressbar e Skeleton, além de uma propriedade duplicada em `HomeGestao/styles.ts`. Em ambientes que distinguem maiúsculas de minúsculas, como o servidor de build Android, alinhe os imports aos nomes reais dos arquivos para evitar erros de resolução.

Com os dois serviços ativos, abra o Swagger, carregue o frontend e entre com uma conta institucional provisionada. Confira se aparecem as telas correspondentes ao papel da conta.

## Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| `npm ci` não encontra o manifesto | Execute o comando na pasta `frontend/`, que contém `package.json` e `package-lock.json`. |
| Swagger retorna 404 | Confira se `DJANGO_DEBUG=true` está no ambiente em que o Django foi iniciado. |
| O navegador bloqueia a API por CORS | Confira a URL da API e inclua a origem do Expo em `DJANGO_CORS_ALLOWED_ORIGINS` se usar outra porta ou outro domínio. |
| Django retorna `DisallowedHost` | Inclua o hostname ou IP usado pelo cliente em `DJANGO_ALLOWED_HOSTS`. |
| O APK abre, mas o login falha | Confira a URL HTTPS no ambiente EAS `preview`, a disponibilidade da API pelo celular e o vínculo da conta. Gere outro APK se corrigir a URL. |
| O build falha ao ler um ícone ou splash | Confira a existência e o caminho de cada imagem declarada em `frontend/app.json`. |

## Outros guias

- [Backend, configuração de produção e tarefas recorrentes](backend/README.md)
- [Rotas da API](backend/API_ENDPOINTS.md)
- [Autenticação, convites e operação](backend/docs/AUTHENTICATION.md)
- [Serviços de merenda](backend/docs/MEAL_SERVICES.md) e [previsões](backend/docs/FORECAST_ENGINE.md)
- [Integração de dispositivos e contagens](backend/docs/VISION_INTEGRATION.md)
- [Indicadores e relatórios](backend/docs/REPORTING_API.md)
- [Configuração de provedores do RealInova](backend/docs/REALINOVA_PROVIDERS.md)

## Contribuir

Crie uma branch a partir de `main`, valide as mudanças e abra um pull request. Use [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) nas mensagens de commit, como `docs: detalha a execução local`.
