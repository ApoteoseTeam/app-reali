# API de câmeras e dispositivos

Base `/api/v1/`. Rotas humanas exigem `Authorization: Bearer <access>` e `X-Organization-ID`. Configuração e heartbeat do agente usam `Authorization: Device <token>` e identificam a escola a partir do agente. Envie JSON com `Content-Type: application/json`. Leia os detalhes de [permissões](CAMERAS.md) e [autenticação](DEVICE_AUTHENTICATION.md).

| Método e rota | Sucesso |
|---|---|
| `GET /cameras/` e `GET /cameras/{id}/` | `200` com lista paginada ou detalhe. Filtros `school`, `camera_type` e `is_active` |
| `POST /cameras/` | `201` com câmera criada |
| `PUT /cameras/{id}/` ou `PATCH /cameras/{id}/` | `200` com câmera atualizada |
| `POST /cameras/{id}/activate/` e `/deactivate/` | `200` com habilitação atualizada |
| `GET /cameras/{id}/status/` | `200` com saúde operacional. A visão completa inclui estado do agente, vídeo, detector, FPS, fila e motivo |
| `GET /cameras/{id}/health-history/` | `200` com histórico mais recente primeiro e paginação |
| `GET /cameras/{id}/configuration/` e `PUT /cameras/{id}/configuration/` | `200` com parâmetros e versão |
| `GET /edge-devices/` e `POST /edge-devices/` | `200` com lista paginada ou `201` com agente criado |
| `GET /edge-devices/{id}/` e `PATCH /edge-devices/{id}/` | `200` com detalhe ou agente atualizado |
| `POST /edge-devices/{id}/credentials/` e `/rotate-credential/` | `201` com metadados e token exibido nessa resposta |
| `POST /edge-devices/{id}/revoke-credential/` | `204` |
| `POST /device/heartbeat/` | `200` com aceite do lote e quantidade atualizada |
| `GET /device/configuration/` | `200` com inventário autorizado e intervalo de heartbeat |
| `POST /device/counts/` | `201` ou `200` para reenvio pelo [contrato de contagens da Fase 4](DEVICE_COUNT_API.md) |

As rotas de suporte espelham as humanas sob `/admin/cameras/` e `/admin/edge-devices/`. Paginação retorna `count`, `next`, `previous` e `results`. O gestor envia o UUID da escola no campo `school`. Para cadastrar câmera, envie `name`, `camera_type`, `school` e, se já houver agente, `edge_device`. Para credenciais, envie `password` no corpo JSON e, quando aplicável, `expires_at` em ISO 8601 com offset.

```json
{
  "agent_version": "1.0.0",
  "observed_at": "2026-11-18T12:00:00-03:00",
  "cameras": [
    {
      "camera_id": "7dd7cb74-bb82-467f-9769-a3acfa75dc5b",
      "video_status": "STREAMING",
      "detector_status": "RUNNING",
      "processing_fps": 19.8,
      "pending_events": 0
    }
  ]
}
```

O exemplo usa timestamp ilustrativo. Envie a hora corrente do lote. A resposta é `{"status":"ok","accepted":true,"updated_cameras":1}`. Os estados de vídeo aceitos são `STREAMING`, `STARTING`, `DISCONNECTED` e `ERROR`. Para o detector, `RUNNING`, `STARTING`, `STOPPED` e `ERROR`. FPS aceita de 0 a 1000 e a fila aceita inteiros de 0 a 2.147.483.647.

- `400` indica corpo, estado ou horário inválido.
- `401` indica credencial de agente ausente, inválida, expirada, revogada ou indisponível.
- `403` indica permissão insuficiente, lote fora do escopo ou credencial legada recusada.
- `404` indica recurso de outra escola/organização, ID inexistente ou configuração ainda ausente.
- `429` indica limite de tráfego. Respeite `Retry-After` quando presente.

## Exemplo Python de comunicação

Em um teste de integração, leia os segredos do ambiente e use o inventário para montar o corpo. O exemplo consulta a configuração e envia um heartbeat vazio, útil para verificar a conexão sem fabricar telemetria de vídeo.

```python
import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen

base = os.environ["REALI_API_BASE"].rstrip("/")  # https://host/api/v1
headers = {
    "Authorization": f'Device {os.environ["REALI_DEVICE_TOKEN"]}',
    "Content-Type": "application/json",
}
with urlopen(Request(f"{base}/device/configuration/", headers=headers), timeout=5) as response:
    inventory = json.load(response)

body = json.dumps({
    "agent_version": "integration-check-1",
    "observed_at": datetime.now(timezone.utc).isoformat(),
    "cameras": [],
}).encode()
with urlopen(Request(f"{base}/device/heartbeat/", data=body, headers=headers), timeout=5) as response:
    acknowledgement = json.load(response)
```

Em caso de falha transitória, aplique espera crescente e preserve `observed_at` se reenviar o mesmo lote. Trate `accepted: false` como duplicado ou antigo. O teste HTTP em `apps/cameras/test_cameras.py` simula duas câmeras contra o servidor Django. Execute `python -m pytest -q apps/cameras` com PostgreSQL para incluir os cenários de concorrência. Swagger e schema estão disponíveis em desenvolvimento em `/api/docs/` e `/api/schema/`.
