# Modelos de notificações

| Modelo | Dados e restrições |
| --- | --- |
| `Notification` | UUID, usuário, organização, escola opcional, tipo, título, mensagem, prioridade, dados mínimos, chave de evento, visibilidade na central, criação, leitura e arquivamento. Unicidade por usuário, organização e evento. |
| `NotificationPreference` | Uma configuração por usuário, organização e tipo. Controla a entrega na central, push e e-mail. |
| `PushDevice` | Uma inscrição por instalação e por token. Guarda o hash do segredo de instalação, o hash de unicidade do token, token criptografado, usuário, plataforma, sessão, vínculo de entrega e histórico operacional de sucesso e falha. |
| `RevokedPushSession` | Registro durável reutilizado pela autenticação JWT para encerrar a sessão e impedir novos registros push associados a ela. |
| `NotificationDelivery` | Uma entrega por aviso e canal, ou uma por aparelho no caso de push. Guarda tentativas, próxima execução, concessão, referência externa e código de erro. |
| `AlertIncident` e `AlertScan` | Estado por origem e condição, com supressão, escalonamento e encerramento, e cursor persistente para varrer as origens em lotes. |

`AuditLog`, `CountAdjustment` e `PendingDailyMetrics` são extensões incrementais dos modelos existentes. A migração liga correções antigas à auditoria quando encontra o registro correspondente. Auditorias históricas com escola verificável passam a usar esse escopo. Registros sem evidência de escola ficam disponíveis apenas no escopo institucional ou da plataforma, conforme a organização.
