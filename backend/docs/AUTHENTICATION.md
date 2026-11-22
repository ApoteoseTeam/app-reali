# Autenticação e operação

O Reali provisiona contas por convite. A solicitação pública registra o interesse da instituição. Uma identidade interna com `is_staff` e a permissão `api.review_institutions` decide a solicitação e provisiona organização, escolas e primeiro diretor numa transação. A mesma identidade pode provisionar diretamente. A aprovação já concluída retorna o registro existente quando repetida e preserva o ator e o horário originais. Faça a gestão das permissões internas com grupos Django ou pelo procedimento restrito de administração.

A API usa o e-mail normalizado e a senha para emitir JWT. O login retorna `access`, `refresh` e `user`. O acesso dura 15 minutos e o refresh dura sete dias a partir da emissão ou rotação. O JWT identifica a conta e a sessão. Vínculos, papéis, escolas e estado ativo são consultados no servidor. Ao renovar, substitua o refresh salvo pelo novo. O logout revoga access e refresh da sessão indicada por um refresh válido. Access tokens legados sem identificador de sessão expiram no prazo original. [Auditoria da Fase 10](AUTHENTICATION_AUDIT.md)

A troca de senha exige senha atual e confirmação da nova. A recuperação pública devolve a mesma resposta para endereços existentes, inativos e desconhecidos. O worker de recuperação gera a prova de uso único do Django no momento do envio, com prazo de uma hora. Uma troca ou recuperação bem-sucedida invalida todas as sessões JWT da conta e as provas anteriores. Senhas novas passam pelos validadores Django e têm pelo menos 12 caracteres. A equipe Reali usa `api.manage_account_sessions` para revogar todas as sessões ou desativar uma conta de usuário comum. A desativação global exige transferir previamente os papéis de direção ativos.

## Operação local e implantação

1. Prepare o PostgreSQL, instale as dependências e revise `python manage.py migrate --plan`. Veja o [guia do backend](../README.md).
2. Configure `REALI_ACTIVATION_URL` e `REALI_PASSWORD_RESET_URL` com URLs HTTPS sem fragmento, por exemplo `https://reali.example/ativar/` e `https://reali.example/recuperar/`. Para usar os fallbacks incluídos, sirva as páginas, os estáticos coletados e `/api/v1/` na mesma origem.
3. Configure o SMTP transacional com `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` e `DEFAULT_FROM_EMAIL`. Guarde as credenciais no ambiente. Use `locmem` nos testes.
4. Execute `python manage.py process_password_reset_mail --limit 50` periodicamente, por exemplo a cada minuto. O comando reserva o lote no banco antes de usar SMTP. Há até cinco tentativas por solicitação, espaçadas em cinco minutos, e expurgo de solicitações em fila com mais de uma hora. Monitore aceite e falhas do transporte. Em produção, agende também `python manage.py flushexpiredtokens` para a blacklist.
5. Use cache compartilhado para que os limites de autenticação, convites e recuperação sejam aplicados entre workers. Configure o limite de tráfego no proxy. Oculte senhas, corpos de autenticação e cabeçalhos de autorização dos logs e da observabilidade.

Veja os [contratos HTTP](API_AUTH_ENDPOINTS.md) e as [instruções para Expo](MOBILE_AUTH_FLOW.md).
