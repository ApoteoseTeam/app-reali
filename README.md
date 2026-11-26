# Finly 💙

**Finly** é uma plataforma de gestão financeira pessoal que está sendo desenvolvida com o objetivo de ajudar usuários a organizar suas finanças, acompanhar movimentações e visualizar informações financeiras em um único lugar.

O projeto busca tornar o controle financeiro mais simples, intuitivo e acessível por meio de uma interface moderna e de uma API para gerenciamento dos dados.

> 🚧 **Status:** Em desenvolvimento. Funcionalidades, arquitetura e integrações poderão mudar durante a evolução do projeto.

## 🎯 Objetivo

Desenvolver uma aplicação full stack para facilitar o gerenciamento financeiro, oferecendo recursos para acompanhar receitas, despesas, contas e categorias, além de visualizar informações relevantes por meio de um dashboard.

## ✨ Funcionalidades

- **Dashboard:** visualização consolidada de informações financeiras.
- **Lançamentos financeiros:** gerenciamento de receitas e despesas.
- **Contas:** organização e acompanhamento de contas financeiras.
- **Categorias:** classificação das movimentações por categoria.
- **API REST:** comunicação entre o frontend e o backend.
- **Interface responsiva:** experiência de uso em desenvolvimento com React.

*As funcionalidades estão sujeitas a alterações conforme o andamento do projeto.*

## 🛠️ Tecnologias utilizadas

### Frontend
- [React](https://react.dev/) — construção da interface.
- JavaScript (JSX) — lógica e componentes.
- [Vite](https://vite.dev/) — ambiente de desenvolvimento e build.
- CSS — estilização da interface.

### Backend
- [Python](https://www.python.org/) — linguagem principal do backend.
- [Django](https://www.djangoproject.com/) — framework web.
- Django REST Framework — desenvolvimento da API REST.
- SQLite — banco de dados utilizado no ambiente atual.

### Ferramentas
- Git e GitHub — versionamento de código.
- Visual Studio Code — ambiente de desenvolvimento.

## 📁 Estrutura do projeto

```text
Finly/
├── .venv/                  # Ambiente virtual Python
├── backend/
│   ├── config/             # Configurações do Django
│   ├── dashboard/          # Aplicação do dashboard
│   │   ├── models.py       # Modelos de dados
│   │   ├── serializers.py  # Serialização dos dados da API
│   │   ├── views.py        # Views e lógica das requisições
│   │   ├── urls.py         # Rotas da aplicação, se configuradas
│   │   ├── admin.py        # Configuração do Django Admin
│   │   ├── apps.py         # Configuração da aplicação
│   │   └── tests.py        # Testes
│   ├── finance/            # Aplicação financeira
│   ├── user/               # Aplicação de usuários
│   ├── db.sqlite3          # Banco de dados local
│   └── manage.py           # Utilitário de gerenciamento Django
├── frontend/
│   ├── public/             # Arquivos públicos
│   ├── src/                # Código-fonte do React
│   ├── package.json        # Dependências e scripts
│   ├── package-lock.json   # Versões das dependências
│   ├── vite.config.js      # Configuração do Vite
│   └── index.html          # Documento HTML principal
├── .env                    # Variáveis de ambiente
└── .gitignore              # Arquivos ignorados pelo Git
```

*Observação: a árvore acima resume a estrutura identificada no projeto; arquivos internos podem ser adicionados ou reorganizados durante o desenvolvimento.*

## ⚙️ Como executar o projeto

### 1. Pré-requisitos

Instale as seguintes ferramentas:

- Python 3.11 ou superior.
- Node.js e npm.
- Git.

### 2. Clonar o repositório

```bash
git clone https://github.com/Kakawm005/Finly
cd Finly
```

### 3. Configurar o backend

Entre na pasta do backend:

```bash
cd backend
```

Ative o ambiente virtual existente, caso esteja na raiz do projeto.

**Windows — PowerShell:**

```powershell
..\.venv\Scripts\Activate.ps1
```

Instale as dependências do backend conforme o arquivo de dependências do projeto. Caso ainda não exista um `requirements.txt`, ele deverá ser criado com as dependências utilizadas.

Execute as migrações:

```bash
python manage.py migrate
```

Inicie o servidor Django:

```bash
python manage.py runserver
```

Por padrão, o servidor fica disponível em `http://127.0.0.1:8000/`.

### 4. Configurar o frontend

Em outro terminal, entre na pasta do frontend:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse o endereço local apresentado pelo Vite no terminal.

> **Importante:** os comandos pressupõem que as dependências e os scripts estejam configurados corretamente. As variáveis de ambiente e a URL da API também precisam estar configuradas conforme o ambiente de execução.

## 🔐 Variáveis de ambiente

O projeto possui arquivos `.env` para configurações locais.

Utilize variáveis de ambiente para armazenar informações como:

- Chaves e segredos da aplicação.
- Configurações de conexão com serviços externos.
- Endereço-base da API, quando aplicável.
- Configurações específicas de desenvolvimento e produção.

**Nunca envie credenciais, chaves privadas ou segredos para o GitHub.** Mantenha os arquivos `.env` fora do versionamento e disponibilize um `.env.example` com os nomes das variáveis necessárias, sem valores secretos.

## 🧪 Testes

O backend possui um arquivo `tests.py` na aplicação `dashboard`, destinado aos testes dessa parte do sistema.

Para executar os testes do Django:

```bash
cd backend
python manage.py test
```

Os testes devem ser ampliados conforme novas funcionalidades e regras de negócio forem implementadas.

## 🗺️ Próximos passos

- [ ] Aprimorar a interface e a experiência do usuário.
- [ ] Expandir os recursos do dashboard financeiro.
- [ ] Evoluir o gerenciamento de contas, categorias, receitas e despesas.
- [ ] Ampliar a cobertura de testes automatizados.
- [ ] Melhorar a validação e o tratamento de erros da API.
- [ ] Fortalecer a segurança e a gestão de variáveis de ambiente.
- [ ] Preparar o projeto para implantação em produção.
- [ ] Avaliar futuras integrações financeiras e recursos de inteligência artificial.

## 👨‍💻 Desenvolvimento

O Finly é um projeto em evolução, desenvolvido para aprofundar conhecimentos em desenvolvimento full stack, construção de APIs REST, integração entre frontend e backend e organização de aplicações web.

## 📄 Licença

A licença do projeto ainda não foi definida. Até que uma licença seja adicionada ao repositório, não presuma que o código esteja liberado para reutilização ou redistribuição.
