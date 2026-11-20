# Agendamento de notificações

No ambiente Django com PostgreSQL, configure tarefas do agendador da hospedagem ou cron. Exemplos para a pasta do backend e o ambiente virtual da aplicação.

| Frequência inicial | Comando |
| --- | --- |
| A cada minuto | `python manage.py process_notifications --alerts-only --limit 100` |
| A cada minuto | `python manage.py process_notifications --delivery-only --limit 100` |
| Diariamente, com lotes conforme o volume | `python manage.py process_notifications --prune-only --limit 1000` |

Sem modo explícito, o comando roda alertas e depois entregas. Preserve as tarefas existentes `maintain_camera_health`, `reconcile_daily_metrics` e as rotinas de conta. A frequência e o lote de alertas devem cobrir as origens ativas dentro da janela de interesse. O cursor avança entre execuções. Separe os modos no agendador para uma falha temporária na avaliação não atrasar a fila de entrega.

O PostgreSQL permite concorrência na fila com `SELECT FOR UPDATE SKIP LOCKED`. Cada trabalho tem uma concessão de dois minutos. Após interrupção, repete-se somente uma entrega disponível ou expirada. O provedor pode aceitar um pedido cuja resposta se perdeu. Esse cenário admite repetição externa, mesmo com deduplicação no Django e identificadores estáveis.

Envios têm até seis tentativas, com backoff de 1, 2, 4, 8 e 16 minutos. Recibos começam após 15 minutos e são verificados até 24 horas após a aceitação. Registre falhas definitivas e acompanhe idade das linhas elegíveis e códigos de erro. Monitore também a duração do próprio agendamento e a taxa de alertas.
