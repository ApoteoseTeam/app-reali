# Notificações por e-mail

Use a configuração SMTP existente, incluindo `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` e `DEFAULT_FROM_EMAIL`. A fila envia lembretes e alertas de categorias com e-mail disponível quando o destinatário escolhe esse canal e ainda tem acesso. O conteúdo convida a abrir o aplicativo. As retentativas repetem o mesmo `Message-ID` da entrega.

E-mails de ativação, recuperação e revogação continuam no fluxo de contas existente. O convite usa o link HTTPS configurado em `REALI_ACTIVATION_URL`, token de uso único e expiração de 48 horas. As notificações internas acompanham o estado para a direção responsável, sem expor e-mail do convidado, senha ou token. A entrega de convite mantém o estado e o reenvio administrativo existentes.
