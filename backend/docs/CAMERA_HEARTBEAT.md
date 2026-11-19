# Heartbeat e histórico

O software local publica `POST /api/v1/device/heartbeat/` com até 100 câmeras por pedido. O fato de o agente estar conectado e o funcionamento de cada câmera são avaliados separadamente. Um heartbeat vazio mantém apenas a conexão do agente. Câmeras omitidas conservam suas últimas amostras. Todos os IDs precisam corresponder a câmeras habilitadas, atribuídas ao agente autenticado e da mesma escola. Um item fora do escopo impede a atualização de todo o lote.

Envie `observed_at` em ISO 8601 com offset. A API usa a hora de recepção quando o campo está ausente. Com timestamp explícito, repita o mesmo valor ao tentar reenviar o mesmo lote. Lotes duplicados, anteriores ou antigos demais retornam `200` com `accepted: false` e preservam a última comunicação. A ordem é por agente. Use horários crescentes e sincronize seu relógio. Evite retransmitir telemetria antiga e envie uma amostra atual após uma interrupção. Horários adiantados além da tolerância retornam `400`.

| Estado da câmera | Regra em ordem de avaliação |
|---|---|
| `UNKNOWN` | Sem comunicação, ou última comunicação legada ainda recente sem telemetria de vídeo e detector |
| `OFFLINE` | Última comunicação da câmera atingiu o limite de silêncio |
| `ERROR` | Vídeo desconectado/em erro ou detector parado/em erro |
| `DEGRADED` | Inicialização, FPS abaixo do mínimo ou fila igual ou acima do limite |
| `ONLINE` | Vídeo e detector funcionando dentro dos limites |

O agente vinculado tem dimensões `UNKNOWN`, `ONLINE`, `OFFLINE` e `DISABLED`. A ausência de vínculo aparece como `UNASSIGNED`. Habilitação da câmera, estado do agente e amostra de vídeo são campos separados. Uma amostra recente conserva seu estado até o limite de silêncio, inclusive após desativação administrativa.

O histórico guarda mudanças de estado ou motivo, eventos administrativos e silêncio constatado. Repetições estáveis não gravam eventos. `OFFLINE` é calculado na leitura. Para registrar silenciosos e aplicar a retenção, execute periodicamente `python manage.py maintain_camera_health`, por exemplo a cada minuto. A retomada também registra o silêncio anterior se ele ainda não tiver sido registrado. Configure retenção separada dos logs estruturados no coletor de logs.

| Variável | Padrão |
|---|---|
| `CAMERA_HEARTBEAT_INTERVAL_SECONDS` | `30` |
| `CAMERA_OFFLINE_TIMEOUT_SECONDS` | `90` |
| `CAMERA_HEARTBEAT_MAX_CLOCK_SKEW_SECONDS` | `30` |
| `CAMERA_HEARTBEAT_MAX_AGE_SECONDS` | `300` |
| `CAMERA_MIN_PROCESSING_FPS` | `10` |
| `CAMERA_PENDING_EVENTS_LIMIT` | `100` |
| `CAMERA_HEALTH_RETENTION_DAYS` | `90` |
| `DEVICE_AUTH_FAILURE_LIMIT` | `20` por minuto |
| `CAMERA_LEGACY_AUTH_ENABLED` | `true` |

O heartbeat usa autenticação e escopo em todos os ambientes. Homologação e produção devem servir HTTPS com `DJANGO_DEBUG=false` e proxy confiável conforme o [guia do backend](../README.md).
