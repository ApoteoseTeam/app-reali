# Autenticação de dispositivos

O software local autentica com `Authorization: Device <token>`. O prefixo serve para localizar a credencial. O segredo é gerado criptograficamente e o banco guarda apenas SHA-256 do token de alta entropia. O servidor faz comparação em tempo constante. O token completo é retornado uma única vez na emissão ou na rotação, com `Cache-Control: no-store`. Listagens e detalhes do agente retornam apenas metadados operacionais.

A emissão, a rotação e a revogação exigem JWT de direção, concessão sobre a escola e confirmação da senha administrativa atual. A equipe interna usa uma permissão Django separada. Cada agente tem no máximo uma credencial ativa. A rotação revoga a anterior na mesma transação que emite a nova. A revogação é idempotente. Após revogação ou perda da resposta de emissão, solicite uma nova emissão ou rotação conforme o estado da credencial. `expires_at` é opcional e deve incluir fuso quando informado.

A API verifica a habilitação e a expiração da credencial, do agente, da escola e da organização. Heartbeat e configuração validam novamente a credencial sob o mesmo lock usado pela rotação e revogação. Um pedido autorizado já concluído conserva seu efeito. Um pedido que aguardou a rotação ou revogação e ainda não iniciou seu efeito é rejeitado com a credencial antiga.

Anexe o token somente ao cabeçalho de autenticação. Guarde-o em armazenamento com acesso exclusivo do serviço, use HTTPS com validação de certificado e exclua cabeçalhos de autorização e corpos com senhas da observabilidade. O limite de falhas usa a origem identificada pelo DRF e `DEVICE_AUTH_FAILURE_LIMIT` por minuto. O tráfego autenticado tem limite de 120 requisições por minuto por identidade, e o gerenciamento de credenciais tem limite de 20 por hora por usuário. Use cache compartilhado em homologação e produção para aplicar os limites entre processos. Configure a topologia confiável em `DJANGO_THROTTLE_NUM_PROXIES`.

O JWT de funcionários autentica somente rotas humanas. As chaves legadas de câmera são aceitas somente nas rotas legadas enquanto habilitadas. Veja [transição das instalações](EDGE_DEVICES.md).
