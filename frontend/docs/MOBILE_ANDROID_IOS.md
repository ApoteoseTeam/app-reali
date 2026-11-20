# Android, iOS e ambientes

Em desenvolvimento, defina `EXPO_PUBLIC_API_URL` em `.env.local` ou no ambiente do processo. Exemplos de URL da API:

| Ambiente | URL de desenvolvimento |
| --- | --- |
| Emulador Android padrão | `http://10.0.2.2:8000/api/v1`, se o runtime local aceitar HTTP. |
| Simulador iOS com Django no mesmo Mac | `http://127.0.0.1:8000/api/v1`, se a política local da build aceitar HTTP. |
| Telefone físico | URL HTTPS atingível pelo telefone. Em rede local, use o IP ou nome do servidor, não o loopback do computador. |
| Homologação e produção | URLs HTTPS distintas, com cadeia de certificados válida e `ALLOWED_HOSTS` configurado no Django. |

O `eas.json` vincula os perfis development, preview e production a seus ambientes. Use o servidor de desenvolvimento com `npx expo start --dev-client` para uma development build, ou Expo Go para explorar módulos suportados, conforme a versão instalada. Para teste nativo use `npx expo run:android` ou, no macOS com Xcode, `npx expo run:ios`. A configuração nativa é definida pelo Expo e seus plugins. Em Windows, exportar o bundle de iOS verifica o JavaScript, enquanto a compilação e o simulador exigem infraestrutura Apple.

## Links de conta

Defina `REALI_LINK_HOST` com o domínio, sem esquema ou porta. Expo gera filtros HTTPS Android com `autoVerify` e `associatedDomains` para iOS. O aplicativo Android conserva o ID `com.guilhermesandrade.apprealimenta`. O iOS usa o mesmo identificador como padrão de configuração e aceita `REALI_IOS_BUNDLE_ID` para o identificador aprovado. Configure `REALI_ACTIVATION_URL` e `REALI_PASSWORD_RESET_URL` no Django com as rotas HTTPS nesse domínio.

Gere os arquivos usando o Apple Team ID e a impressão SHA-256 do certificado efetivo que assina a build Android:

```powershell
node scripts/link-associations.cjs dist/link-associations
```

O comando lê `REALI_APPLE_TEAM_ID`, `REALI_IOS_BUNDLE_ID` quando aplicável e `REALI_ANDROID_SHA256`, que aceita múltiplas impressões separadas por vírgula. Publique os arquivos gerados em `/.well-known/` com HTTPS, tipo JSON e resposta 200 direta. O host do link precisa também servir o fallback Django `/ativar/` e `/recuperar/`. Use development build compatível ou build assinada para testar a associação.

Valide pelo telefone com e sem o app instalado. Confira abertura pelo e-mail, instalação limpa, app em primeiro plano, app suspenso, teclado, SecureStore após reabertura, sessão expirada, bloqueio de tela e perda de rede. Para as duas plataformas, confira leitura do PDF e do CSV pelo compartilhamento nativo.

[Android App Links](https://docs.expo.dev/linking/android-app-links/) · [iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/) · [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
