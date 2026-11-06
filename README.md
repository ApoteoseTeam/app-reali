<div>
  Se você esta vendo isso nessa etapa do projeto, você é um desenvolvedor.

Para começar a desenvolver, siga os seguintes passos:

1 - Clone o reposotório.

2 - confira se esta conectado ao repositório remoto: https://github.com/ApoteoseTeam/ReAlimenta.git

3 - Faça as atualizações/novas funcionalidades.

4 - faça o commit.

5 - suba para repositório remoto.

Obs:

1 - Siga o padrão de commits para TODO projeto: https://www.conventionalcommits.org/pt-br/v1.0.0-beta.4/

# Guia de Desenvolvimento — Realimenta

Este guia apresenta as instruções para configurar e executar o projeto **Realimenta** localmente, utilizando React Native, Expo e TypeScript.

O desenvolvimento será realizado no VS Code, com visualização da aplicação diretamente pelo navegador.

## 1. Tecnologias utilizadas

- **React Native:** desenvolvimento da interface da aplicação.
- **Expo SDK 58:** ferramentas e infraestrutura de desenvolvimento.
- **TypeScript:** linguagem utilizada no projeto.
- **React Native Web:** execução da aplicação no navegador.
- **Git e GitHub:** versionamento e colaboração entre integrantes.

## 2. Pré-requisitos

Antes de clonar o repositório, instale:

| Ferramenta | Versão recomendada | Download |
|---|---|---|
| Node.js | 24 LTS, 24.3+ | https://nodejs.org/ |
| Git | Versão estável | https://git-scm.com/downloads |
| VS Code | Versão estável | https://code.visualstudio.com/ |
| Navegador | Chrome, Edge ou Firefox atualizado | — |

O npm acompanha a instalação do Node.js.

**Não é necessário instalar:** Android Studio, Java JDK, Gradle, Expo CLI globalmente ou emuladores Android/iOS.

### Verificar as instalações

Abra o terminal e execute:

```bash
node -v
npm -v
git --version
```

Os comandos devem retornar as versões instaladas.

## 3. Clonando o repositório

Abra o terminal do VS Code ou PowerShell e execute:

```bash
git clone https://github.com/ApoteoseTeam/app-realimenta.git
```

Entre na pasta do projeto:

```bash
cd app-realimenta
```

> **Importante:** integrantes precisam ter acesso à organização ou ao repositório no GitHub caso ele seja privado.

## 4. Instalando as dependências

Na raiz do projeto, execute:

```bash
npm ci
```

Esse comando instala as dependências conforme as versões registradas no arquivo `package-lock.json`.

As principais dependências incluem:

- React
- React Native
- Expo
- TypeScript
- React Native Web
- React DOM
- Expo Metro Runtime

Não é necessário instalar essas dependências individualmente.

**Atenção:** não execute `npm audit fix --force` sem alinhamento com a equipe. Atualizações forçadas podem causar incompatibilidades com o Expo.

## 5. Executando o Realimenta na Web

Após instalar as dependências, execute:

```bash
npx expo start --web
```

O Expo iniciará o servidor de desenvolvimento.

Normalmente, a aplicação estará disponível em:

```text
http://localhost:8081
```

Abra esse endereço no navegador.

### Atualizações em tempo real

O Expo utiliza Fast Refresh para atualizar a aplicação durante o desenvolvimento.

Ao modificar um componente e salvar o arquivo, as alterações geralmente serão refletidas automaticamente no navegador.

Para encerrar o servidor:

```text
Ctrl + C
```

## 6. Organização do trabalho com Git

Cada integrante deve desenvolver suas funcionalidades em uma branch própria.

Evite realizar alterações diretamente na branch `main`.

### Atualizar a branch principal

Antes de iniciar uma tarefa:

```bash
git switch main
git pull origin main
```

### Criar uma branch

```bash
git switch -c feature/nome-da-funcionalidade
```

Exemplos de nomes:

```text
feature/tela-login
feature/tela-home
feature/cadastro-usuario
fix/correcao-formulario
```

### Registrar alterações

Depois de concluir uma alteração:

```bash
git status
git add .
git commit -m "feat: adiciona tela de login"
```

### Enviar a branch ao GitHub

```bash
git push -u origin feature/nome-da-funcionalidade
```

Em seguida, abra um **Pull Request** no GitHub para que as alterações sejam revisadas antes de integrar à `main`.

## 7. Padrão de commits

Utilizamos mensagens padronizadas para facilitar o acompanhamento das alterações.

| Prefixo | Utilização |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de erro |
| `refactor:` | Refatoração sem mudança funcional |
| `style:` | Ajustes de formatação do código |
| `docs:` | Alterações na documentação |
| `chore:` | Configurações e manutenção |
| `test:` | Inclusão ou alteração de testes |

Exemplos:

```bash
git commit -m "feat: implementa cadastro de usuários"
git commit -m "fix: corrige validação do formulário"
git commit -m "docs: atualiza instruções de instalação"
```

## 8. Boas práticas de desenvolvimento

- Utilize TypeScript para tipar componentes, propriedades, funções e dados.
- Evite modificar arquivos de configuração sem comunicar a equipe.
- Crie componentes reutilizáveis.
- Mantenha as alterações organizadas por funcionalidade.
- Não envie `node_modules` para o GitHub.
- Não publique senhas, tokens, credenciais ou arquivos `.env` com informações sensíveis.
- Execute a aplicação antes de abrir um Pull Request.
- Atualize a documentação sempre que houver mudanças relevantes no ambiente.

## 9. Solução de problemas

### O comando `npm` não é reconhecido

Verifique se o Node.js está instalado:

```bash
node -v
```

Se necessário, reinstale o Node.js e reinicie o terminal.

### O comando `npm ci` apresenta erros

Verifique se você está na raiz do projeto, onde ficam `package.json` e `package-lock.json`.

Se esses arquivos estiverem corretos e o erro persistir, compartilhe a mensagem no canal técnico da equipe antes de modificar as dependências.

### A aplicação Web não inicia

Execute:

```bash
npx expo-doctor
```

Para verificar a compatibilidade das dependências.

Se houver problemas relacionados ao cache, tente:

```bash
npx expo start --web --clear
```

### A porta 8081 está ocupada

O Expo poderá solicitar outra porta. Utilize o endereço informado no terminal.

### A aplicação funciona no Android, mas não na Web

Algumas bibliotecas nativas não possuem suporte Web.

Nesses casos, será necessário verificar a compatibilidade da biblioteca ou implementar um comportamento específico para o navegador.

## 10. Fluxo diário resumido

Após a configuração inicial:

1. Abrir o VS Code.
2. Atualizar a branch principal com `git pull`.
3. Criar ou acessar sua branch de trabalho.
4. Executar `npx expo start --web`.
5. Desenvolver e testar as funcionalidades.
6. Criar commits com mensagens padronizadas.
7. Enviar as alterações ao GitHub.
8. Abrir um Pull Request para revisão.

---

**Equipe:** Apoteose Team  
**Projeto:** Realimenta  
**Stack mobile/web:** React Native + Expo + TypeScript

> O objetivo deste fluxo é manter o desenvolvimento colaborativo organizado e permitir que todos trabalhem no Realimenta utilizando apenas o computador e o navegador, sem necessidade de emuladores.
</div>
