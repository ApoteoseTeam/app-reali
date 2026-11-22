# Notificações do Reali

Os serviços Django registram avisos por destinatário e organização. Eventos de merenda, ajustes, reconciliação, convites e vínculos publicam na transação de domínio. O agendador usa a telemetria e os estados persistidos em câmeras, agentes, indicadores, convites e serviços. A central consulta essas informações com o mesmo JWT e contexto institucional usados pelo restante da API.

A criação grava atomicamente o aviso e suas entregas. Um comando distinto do processo web assume entregas com bloqueio PostgreSQL e uma concessão que expira. O worker consulta as permissões e preferências vigentes antes de interagir com SMTP ou Expo. Em casos de interrupção, as entregas podem voltar a ser processadas ao expirar a concessão.

Veja [modelos](NOTIFICATIONS_MODELS.md), [eventos](NOTIFICATIONS_EVENTS.md), [contrato HTTP](NOTIFICATIONS_API.md) e [execução](NOTIFICATIONS_SCHEDULING.md).
