# Integração da autenticação com React Native e Expo

1. Faça login em `/api/v1/auth/login/`. Guarde o refresh no Expo SecureStore (Keychain/Keystore). Mantenha o access token em memória. Evite guardar credenciais em AsyncStorage, telemetria ou parâmetros de navegação persistidos.
2. Consulte `GET /auth/me/`, permita escolher um vínculo ativo e solicite `GET /auth/me/schools/` com `X-Organization-ID`. Guarde somente os identificadores de contexto necessários. Envie o access token em `Authorization: Bearer …`.
3. Ao receber `401` de uma rota protegida, sincronize uma única renovação, substitua o refresh salvo e repita a requisição no máximo uma vez. Se a renovação falhar, limpe a sessão e peça login. Após troca de senha, recuperação ou revogação global, a sessão antiga perde a validade.
4. Ao receber `403` no contexto institucional, recarregue o usuário e as escolas para refletir revogação ou mudança de acesso. Para `404` em recurso antes autorizado, atualize a tela e a seleção. Trate `429` respeitando `Retry-After` quando presente.
5. Para encerrar, envie o refresh a `/auth/logout/` e limpe o armazenamento local. Em caso de falha de rede, informe que a limpeza local ocorreu e que a revogação remota não foi confirmada.

## Links de ativação e recuperação

O app recebe `https://<domínio>/ativar/#token=…` ou `https://<domínio>/recuperar/#token=…`, valida origem e caminho, extrai a prova do fragmento e envia no corpo JSON por HTTPS. Mantenha a prova apenas em memória até concluir ou abandonar a tela. Valide convites com `/auth/invitations/verify/`. Para conta existente, preserve a prova em memória durante o login em caso de `401` com código `login_required` e aceite usando o JWT da conta convidada.

- No Android, configure `android.intentFilters` com ação `VIEW`, `autoVerify: true`, categorias `BROWSABLE` e `DEFAULT` e os caminhos exatos. Publique `/.well-known/assetlinks.json` com o package e o SHA-256 do certificado que assina a versão instalada. [Expo Android App Links](https://docs.expo.dev/linking/android-app-links/)
- No iOS, configure `ios.associatedDomains` com `applinks:<domínio>`. Publique `/.well-known/apple-app-site-association` com Team ID, bundle ID e os caminhos `/ativar/` e `/recuperar/`. [Expo iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/)

Sirva os arquivos de associação pelo domínio definitivo em HTTPS e teste os links com builds assinados e com o app desinstalado. O fallback Django oferece ambas as páginas, remove o fragmento do endereço ao carregar e evita armazenar as credenciais no navegador. Para preservá-lo, use as URLs configuradas sem intermediários que reescrevam os links. Domínios, assinaturas e dispositivos dependem da configuração externa.
