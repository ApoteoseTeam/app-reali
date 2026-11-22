# Relatório de entrega da Fase 2

O backend local executa o fluxo de solicitação, aprovação, provisionamento, convite e ativação. A direção e os funcionários autenticam por JWT e usam apenas o escopo concedido. A publicação do site, o SMTP real e a integração do aplicativo assinado ainda precisam ser verificadas.

## Arquivos e dados

| Área | Criados | Alterados |
|---|---|---|
| Serviços e API | `access_views.py`, `access_serializers.py`, `session_auth.py`, `institution_service.py`, `invitation_service.py`, `membership_service.py`, `account_service.py`, `account_mail.py` e `audit.py` em `apps/api/` | `apps/api/models.py`, `serializers.py`, `permissions.py`, `urls.py` e `views.py` |
| Páginas e transporte | `account_web.py`, estáticos e templates de conta, quatro pares de templates de e-mail e comando `process_password_reset_mail` em `apps/api/` | `config/settings.py`, `config/urls.py` e `.env.example` |
| Dados | `SchoolAccess`, `AuditLog`, `PasswordResetMail` e três migrations `0002` em `apps/users`, `apps/api` e `apps/institutions` | `User`, `Membership`, `Organization`, `InstitutionRequest` e `UserInvitation` |
| Verificação | `apps/api/test_phase2.py` | `apps/api/test_api.py` para representar as concessões explícitas nas fixtures legadas |
| Expo |  | `TelaInicial` e `loginCadastro` tiveram o autocadastro demonstrativo removido |
| Documentação | `AUTHENTICATION.md`, `INVITATIONS.md`, `MULTITENANCY.md`, `PERMISSIONS.md`, `MOBILE_AUTH_FLOW.md`, `API_AUTH_ENDPOINTS.md` e este relatório | `README.md`, `API_ENDPOINTS.md` e `MOBILE_REACT_NATIVE.md` do backend |

As migrations adicionam campos de escopo e sessão, revisão e convite inicial, escolas no convite, status de transporte e constraints. O campo de telefone institucional passa a aceitar o limite que já existia na solicitação. Veja a [política de migração dos dados legados](MULTITENANCY.md).

## Evidência e aceite

| Estado | Funcionalidade ou verificação | Resultado |
|---|---|---|
| Validado | Solicitação pública e ausência de cadastro público | Contrato HTTP da solicitação pendente, rota de registro ausente e autocadastro removido do protótipo. |
| Validado | Aprovação, rejeição e provisionamento | Operador interno com permissão, decisão idempotente mesmo em corrida, criação de organização/escolas, recuperação do convite inicial e ativação do diretor. |
| Validado | Convite e ativação | Transporte de teste, HTML e link, falha e reenvio no mesmo registro, expiração, revogação, uso único, corrida de aceite, conta existente com senha preservada. |
| Validado | Vínculos, isolamento e papéis | Consultas e escritas no escopo autorizado, alteração imediata durante uma sessão, proteção do último diretor e troca de escolas sem atualização parcial. |
| Validado | Sessões e senhas | Login, rotação, logout, revogação global, troca e recuperação com fila e transporte de teste. |
| Validado | Páginas web de ativação e recuperação | Navegação local no Edge headless com conta nova, conta existente e recuperação. Cabeçalhos de segurança e remoção do fragmento verificados. |
| Validado | `python -m pytest -q` | PostgreSQL 18 isolado com 17 aprovados. SQLite com 15 aprovados e dois cenários de concorrência reservados ao PostgreSQL. |
| Validado | Esquema, migração e qualidade do backend | `check`, `makemigrations --check --dry-run`, plano/aplicação em PostgreSQL isolado, upgrade de uma cópia da Fase 1 com dados legados representativos, Ruff, sintaxe JS e OpenAPI com `--fail-on-warn`. |
| Validado com ressalva | `check --deploy` | Somente `security.W004`. HSTS depende da confirmação do domínio e do TLS. |
| Falhou | TypeScript global do Expo | Divergências de capitalização em imports e módulos ausentes em SplashScreen. TypeScript e ESLint dos arquivos alterados passaram. |
| Não verificado | Operação externa | Site oficial, entrega por SMTP real, worker agendado em produção, publicação HTTPS e App Links/Universal Links em builds assinados. O login do Expo continua demonstrativo. |
| Não verificado | Postman CLI | A versão instalada rejeitou `postman status`. A evidência HTTP vem dos testes DRF e do navegador local. |

O backend está pronto para integração controlada. O aceite completo em ambiente real depende de conectar o site oficial e o aplicativo, configurar os domínios assinados e observar a entrega por SMTP. Nenhuma migration foi aplicada a uma base de implantação.

## Endpoints, configuração e integração

- [Mapa de endpoints e exemplos JSON](API_AUTH_ENDPOINTS.md)
- [Serviços, JWT, SMTP, variáveis e worker](AUTHENTICATION.md)
- [Permissões e critérios de acesso](PERMISSIONS.md)
- [Fluxo Expo, Android App Links e iOS Universal Links](MOBILE_AUTH_FLOW.md)
