# Autenticação e recuperação de conta

O login envia e-mail e senha para `POST auth/login/`. O access token dura em memória. Android e iOS guardam somente o refresh token persistente no Expo SecureStore. A execução web usa memória. Ao abrir o app, a sessão aguarda recuperação e consulta `GET auth/me/`, `GET organizations/` e `GET auth/me/schools/` antes de expor os dados protegidos.

Respostas 401 elegíveis desencadeiam uma renovação compartilhada. A rotação salva o novo refresh antes de liberar as requisições que aguardam. Leituras voltam a executar uma vez. Mutações comuns pedem nova confirmação. O chat pode repetir um envio com a mesma chave de idempotência. Quando a renovação é rejeitada, o app limpa as credenciais e volta ao login. A saída encerra o contexto local e tenta revogar o último refresh em `POST auth/logout/`.

O perfil exibe os campos autorizados. Somente `full_name` pode ser alterado em `PATCH auth/me/`. A troca de senha usa senha atual, nova senha e confirmação em `auth/change-password/` e encerra a sessão local. Um pedido de recuperação usa `auth/password-reset/request/`. O link leva à confirmação em `auth/password-reset/confirm/`.

## Convites

O backend emite o link HTTPS com o token no fragmento. O app aceita o domínio configurado, captura o token em memória e verifica o convite por corpo JSON. Uma pessoa com conta existente confirma o vínculo após autenticar sua sessão. Uma nova conta define nome e senha no fluxo de ativação. A decisão sobre validade, expiração, aceite e revogação é do servidor. O Django também serve as páginas web de ativação e recuperação para quem abre o link no navegador.

[Android App Links e iOS Universal Links](MOBILE_ANDROID_IOS.md) · [SecureStore no SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
