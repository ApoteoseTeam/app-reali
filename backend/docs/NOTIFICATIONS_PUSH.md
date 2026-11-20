# Configuração e processamento do push

No servidor, gere uma chave Fernet por ambiente com `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Guarde-a em `NOTIFICATION_PUSH_KEYS`, fora do Git. Ao trocar chaves, coloque a nova primeiro e conserve as anteriores durante a renovação das inscrições. Configure `NOTIFICATION_EXPO_ACCESS_TOKEN` no servidor quando habilitar a segurança reforçada no projeto Expo.

No Android, vincule o application ID do app ao projeto Firebase, configure FCM v1 no EAS e forneça o caminho do `google-services.json` em `REALI_GOOGLE_SERVICES_FILE`. No iOS, use o bundle ID registrado, habilite Push Notifications, configure a chave APNs no EAS e gere um build assinado. Compile novamente após adicionar o config plugin de notificações. Use os perfis Expo da organização e confira o `extra.eas.projectId`. [Configuração Expo para Android e iOS](https://docs.expo.dev/push-notifications/push-notifications-setup/).

No dispositivo, abra as preferências do Reali, habilite push no aparelho e escolha os tipos desejados. A inscrição acompanha a sessão renovada, a atualização do token nativo, a troca de conta com prova de instalação e a revogação de logout. A central continua acessível com permissão negada.

| Estado | Significado |
| --- | --- |
| `PENDING` | Aguarda a primeira tentativa ou um retry. |
| `SENT` | O worker iniciou o processamento da tentativa e ainda está aguardando resultado. Uma interrupção permite recuperação após expirar a concessão. |
| `ACCEPTED` | O Expo retornou um ticket ou o SMTP aceitou a mensagem. |
| `CONFIRMED` | O recibo Expo confirma o repasse a APNs/FCM, ou o registro in-app está persistido. A leitura é uma ação separada, com `read_at`. |
| `REJECTED` | O provedor rejeitou explicitamente a tentativa. `DeviceNotRegistered` desativa o vínculo correspondente. |
| `FAILED` | A janela de envio ou recibo esgotou, ou houve falha definitiva. |
| `CANCELLED` | Mudou o vínculo, a conta, o dispositivo, o arquivo ou a preferência de entrega. |

Push só contém o UUID da notificação e texto genérico. O app resolve o UUID na organização e escola selecionadas e autoriza a rota contextual. Um push em trânsito ainda pode aparecer genericamente após logout ou revogação. O conteúdo privado depende de autenticação e acesso vigentes no Django. [Tickets e recibos do Expo](https://docs.expo.dev/push-notifications/sending-notifications/).
