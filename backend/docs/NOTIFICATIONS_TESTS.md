# Testes de notificações

No backend, execute a suíte com PostgreSQL para verificar também concorrência, transações e `SKIP LOCKED`.

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python manage.py check --deploy
python -m pytest -q
```

No frontend, execute `npm run lint`, `npm run typecheck`, `npm test` e `npx expo-doctor`.

Os testes de serviço simulam respostas do Expo e SMTP. As verificações cobrem o escopo da central, isolamento, permissões, histórico, ajustes, transações, registro de dispositivos, logout, opt-out e recibos. A confirmação completa em Android e iOS exige um build nativo, credenciais válidas e um dispositivo ou emulador compatível. Teste separadamente permissão negada, push com o app suspenso ou encerrado, troca de conta e revogação. Consulte [configuração de push](NOTIFICATIONS_PUSH.md) e [relatório de validação](PHASE9_REPORT.md).

Para a simulação HTTP opcional, rode na raiz do projeto `postman simulation run postman/simulations/reali-notifications/push.sim.yaml --port 4039 --no-history`. No ambiente de teste do backend, defina `REALI_POSTMAN_EXPO_TEST_URL=http://127.0.0.1:4039/expo` e execute `python -m pytest apps/notifications -q`. O worker usa a mesma serialização HTTP, validação de resposta, fila e lógica de recibo do transporte Expo.
