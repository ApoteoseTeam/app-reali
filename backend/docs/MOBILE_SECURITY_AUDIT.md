# Auditoria do aplicativo React Native

O navegador protegido exige sessão e contexto ativo. O access fica em memória e o refresh é armazenado no SecureStore do Android e iOS. A execução web usa memória. A API exige HTTPS em builds publicados, renova em fluxo compartilhado e descarta respostas que pertencem a uma geração antiga de sessão.

A troca de contexto aborta requisições anteriores e invalida o cache da organização/escola anterior. A auditoria verificou essa lógica nos fluxos de início, merenda, contagens, relatórios, histórico, câmeras, funcionários, notificações, perfil, configuração e RealInova. O app valida navegação originada de links e avisos, e as APIs de destino reaplicam permissões.

O logout trata a persistência da sessão e a confirmação remota como operações independentes. A regressão comprova que uma falha no SecureStore aparece mesmo com um HTTP 401 do logout. O teste do cliente acompanha JWT, escopo, rede indisponível, cancelamento, renovação, mutações e respostas de permissão. ESLint, TypeScript e Expo Doctor validaram a configuração do projeto.

`npm run test:backend` passou contra Django em loopback e PostgreSQL isolado, com escola autorizada, escopo externo recusado, previsão, transições, PDF, central e destino autorizado, chat persistido, rotação e rejeição imediata do access após logout. A primeira tentativa do smoke encontrou o TypeScript indisponível durante `npm ci`. A repetição após a instalação concluiu o fluxo.

Foram exportados bundles para Android, iOS e web. Maestro e aparelhos Android/iOS assinados não estavam disponíveis no ambiente desse ensaio. Permanecem os testes nativos de SecureStore, navegação fria, links assinados, estados visuais em aparelho e push APNs/FCM. [Testes mobile](../../frontend/docs/MOBILE_TESTS.md) · [Guia do Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
