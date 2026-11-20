# Testes mobile

Execute no diretório `frontend`:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android --platform ios
```

Os testes de Node exercitam o cliente real com transporte simulado. Cobrem URL, Bearer e escopo, timeout, cancelamento, refresh concorrente, rotação, logout, prevenção de reenvio sem idempotência, erros HTTP, permissão, dados provisórios, contratos de merenda, convites, histórico, exportação e chat.

## Cliente HTTP com Django real

Use um PostgreSQL isolado com nome iniciado por `reali_phase8`. Configure as variáveis locais do Django, aplique as migrações e escolha uma senha sintética exclusiva para `REALI_SMOKE_PASSWORD`. Crie os dados de teste a partir de `backend`:

```powershell
python manage.py shell -c 'from pathlib import Path; exec(Path("../frontend/tests/seed_mobile.py").read_text(encoding="utf-8"))'
python manage.py runserver 127.0.0.1:58008 --noreload
```

Habilite `REALINOVA_ENABLED=true` para o servidor. O teste usa uma pergunta atendida pela consulta determinística do RealInova. Na sessão do frontend, informe o mesmo `REALI_SMOKE_PASSWORD`, `REALI_SMOKE_URL=http://127.0.0.1:58008/api/v1` e o identificador sintético da organização externa em `REALI_SMOKE_OUTSIDE`. Execute `npm run test:backend`. O teste modifica o serviço sintético, então prepare outra base de teste para repetir a transição desde PLANNED.

## Teste em aparelho ou emulador

`frontend/.maestro/mobile-smoke.yaml` descreve login, dashboard, contagens, preparo, previsão, distribuição, finalização, relatório, chat e logout. Use uma build instalada que aponte para a API de teste. Forneça as variáveis de teste ao executar o fluxo.

```powershell
maestro test -e APP_ID=com.guilhermesandrade.apprealimenta -e REALI_SMOKE_PASSWORD=$env:REALI_SMOKE_PASSWORD .maestro/mobile-smoke.yaml
```
 Execute o teste com um serviço sintético ainda planejado e valide a lista de plataforma em [Android e iOS](MOBILE_ANDROID_IOS.md).

## Resultados no ambiente local

| Verificação | Resultado |
| --- | --- |
| TypeScript e ESLint | Os comandos passaram. |
| Cliente com transporte simulado | 12 testes passaram. |
| Expo Doctor | 20 de 20 verificações passaram após alinhar os patches do SDK 58. |
| PostgreSQL e Django | 93 passaram e um teste opcional de carga foi pulado. `manage.py check`, migrações em modo de verificação e validação do OpenAPI passaram. |
| Cliente em HTTP com Django isolado | Passaram login JWT, perfil, organização e escola, recusa de outro tenant, dashboard, 25 entradas, snapshot e previsão de 20 pratos, transições, 19 pratos do dia anterior, histórico, PDF, câmeras, leitura e edição de parâmetros técnicos, funcionários, replay de chat, rotação e logout. |
| Fallback público | Postman confirmou HTTP 200 em `/ativar/`. O servidor Django também devolveu 200 em `/recuperar/`. |
| Bundles Expo | Android e iOS exportados para Hermes, cerca de 5,6 MB cada. |
| Associação dos links | Arquivos para Android e iOS gerados com identificadores sintéticos e conferidos contra a configuração pública do Expo. |

Os testes em dispositivos e o fluxo Maestro ficam pendentes. O ambiente Windows não tinha SDK Android, emulador Android ou infraestrutura macOS/Xcode. Os arquivos de associação do domínio real dependem das assinaturas da aplicação aprovada. A auditoria `npm audit --omit=dev` registrou três alertas moderados na cadeia de dependências do Expo. A correção automática indicada exigiria trocar de versão principal do SDK.

