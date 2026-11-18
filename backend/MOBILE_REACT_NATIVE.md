# Integração mobile Android/iOS

- Use HTTPS e o mesmo contrato REST para Android e iOS.
- Armazene refresh token em `expo-secure-store`/Keychain/Keystore. Access token preferencialmente em memória.
- No header envie `Authorization: Bearer ...` e `X-Organization-ID: UUID` para dados institucionais.
- Não salve senha ou credenciais de câmera no aplicativo.
- Ao receber `401`, faça uma única renovação por vez, grave o novo refresh e repita a requisição uma vez. Em caso de falha na renovação, solicite login.
- Trate `403` como falta de permissão, `400` como erro de validação e `429` como limite temporário. Nas listas paginadas, use `results` e siga `next`.
- Link de ativação pode abrir página HTTPS e depois deep link verificado (Universal Links no iOS / App Links no Android).
- Diferencie ausência de conexão e câmera offline; não trate um valor zero como erro de rede.
- `StudentCount` mede entradas acumuladas, não alunos atualmente presentes. `PlateCount` mede pratos entregues, não pessoas únicas.
