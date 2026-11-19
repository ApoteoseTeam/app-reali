# Configuração operacional

A direção lê e substitui parâmetros em `GET|PUT /api/v1/cameras/{id}/configuration/`. O PUT recebe os parâmetros completos. A primeira configuração tem versão 1. Conteúdo diferente incrementa a versão, e repetir o mesmo PUT preserva a versão. A resposta contém `version`, `updated_at` e `parameters`. Uma câmera sem configuração retorna `404` nessa consulta. O agente usa `GET /api/v1/device/configuration/` e recebe somente câmeras ativas atribuídas à sua identidade, com configuração `null` quando ainda ausente.

Coordenadas vão de 0 a 1, com origem no canto superior esquerdo. A região de interesse usa retângulo com largura e altura positivas. A linha possui pontos distintos e deve caber na região quando ambas forem informadas. O sinal do lado da linha é dado por `(end.x-start.x)*(p.y-start.y) - (end.y-start.y)*(p.x-start.x)`. Escolha a mudança de sinal que representa entrada ou entrega no local.

Exemplo para portaria.

```json
{
  "event_kind": "STUDENT_ENTRY",
  "trigger": "LINE_CROSSING",
  "desired_fps": 20,
  "confidence_threshold": 0.55,
  "algorithm_version": "1.2.0",
  "counting_line": {
    "start": {"x": 0.1, "y": 0.5},
    "end": {"x": 0.9, "y": 0.5},
    "direction": "NEGATIVE_TO_POSITIVE"
  },
  "tracker": {"track_buffer_frames": 40, "match_threshold": 0.8}
}
```

A portaria permite apenas `STUDENT_ENTRY` com linha direcional. A cantina usa `PLATE_DELIVERY` e admite linha direcional ou `DELIVERY_ZONE` com `region_of_interest: {top_left, bottom_right}`. Os parâmetros descrevem o evento que a configuração pretende observar. A detecção, deduplicação visual e aplicação dos parâmetros ocorrem no software existente. URL de captura, credenciais RTSP e demais segredos ficam na configuração protegida do computador local. A API rejeita campos de configuração desconhecidos.
