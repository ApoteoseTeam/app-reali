# Eventos e alertas

| Origem | Tipos produzidos | Destinatários |
| --- | --- | --- |
| Estado de câmera | `CAMERA_OFFLINE`, `CAMERA_ERROR`, `CAMERA_RECOVERED` | Gestor com acesso à escola. |
| Heartbeat de câmera e agente | `DEVICE_SYNC_DELAY`, `DEVICE_OFFLINE` | Gestor com acesso à escola. O atraso de sync exige a fila explicitamente reportada acima do limite. |
| Merenda | `MEAL_SERVICE_REMINDER`, `MEAL_SERVICE_STARTED`, `MEAL_SERVING_STARTED`, `MEAL_SERVICE_FINISHED`, `MEAL_SERVICE_CANCELLED`, `FORECAST_UNAVAILABLE` | Gestor e cozinha com acesso à escola. |
| Convites e vínculos | `INVITATION_CREATED`, `INVITATION_EXPIRING`, `INVITATION_CLOSED`, `MEMBERSHIP_UPDATED` | Gestor responsável pelo convite com acesso vigente. A atualização de vínculo é privada do titular ativo. |
| Contagens corrigidas | `COUNT_ADJUSTMENT_CREATED` | Gestor com acesso à escola. Inclui reversão. |
| Indicadores | `DATA_STALE`, `DATA_RECONCILED`, `FORECAST_DIFFERENCE` | Perfis de relatórios autorizados para a escola, incluindo Secretaria quando o vínculo permite. |
| Reservados | `REPORT_READY`, `SYSTEM_ANNOUNCEMENT` | Disponíveis no catálogo para uso posterior. As exportações síncronas continuam auditadas. |

O alerta de câmera usa heartbeat, vídeo, detector e FPS. O limite de ausência de heartbeat fica em 90 segundos por padrão. O worker espera mais 120 segundos para alertar, suprime repetições do mesmo incidente, emite até um escalonamento crítico após 30 minutos e informa recuperação quando havia um alerta de câmera. O atraso de sync exige `pending_events` presente no heartbeat e acima ou igual ao limite padrão de 100. Fila desconhecida e períodos sem contagem fornecem zero evidência para abrir esse alerta.

O lembrete cobre a janela anterior ao horário programado, com 20 minutos de antecedência por padrão. Usa o fuso de operação atual `America/Sao_Paulo` e só considera serviços realmente planejados. O backend hoje usa o mesmo fuso para todas as escolas.

Indicadores podem gerar aviso após 60 minutos pendentes desde o enfileiramento inicial. A comparação exige dia consolidado, serviço finalizado com cobertura elegível, total servido disponível e previsão positiva. Os dois limites padrão são 20 pratos e 30% da previsão. A mensagem informa a diferença operacional entre previsão e pratos servidos.

Convites expirando são verificados nas 12 horas finais. O estado de expiração e a auditoria são persistidos pelo worker. O tempo da última atividade de contagem não comprova atraso no agente. O software independente existente fornece tamanho de fila por câmera e heartbeat. Indicadores de idade do evento mais antigo na fila e totais de falhas no agente dependem de telemetria adicional, prevista para outra fase.
