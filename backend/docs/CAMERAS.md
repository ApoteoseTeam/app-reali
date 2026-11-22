# Câmeras no Reali

Uma organização contém escolas. Cada escola pode cadastrar várias câmeras e vários agentes locais. Uma câmera continua pertencendo a uma escola e pode ser vinculada a um agente dessa mesma unidade. `ENTRANCE` corresponde à contagem de entradas, e `CAFETERIA` corresponde à entrega de pratos. O software de visão existente captura e processa o vídeo no computador local. O Django recebe telemetria JSON e fornece configurações autorizadas.

O campo `is_active` representa a habilitação administrativa. O estado operacional e a última comunicação são independentes. Identificadores de câmera, escola e agente são UUID. Remoções de câmera usam desativação para preservar o histórico. Câmeras atribuídas ou com contagens, eventos ou configuração preservam escola e tipo. Alterar a associação reinicia a telemetria da câmera e registra um evento técnico.

## Permissões por escopo

| Papel | Estado | Histórico técnico | Cadastro, configuração e credenciais |
|---|---|---|---|
| Direção | Sim | Sim | Sim |
| Gestão | Sim | Sim | Sem acesso |
| Nutricionista | Sim | Últimos sete dias | Sem acesso |
| Cozinha | Estado resumido da cantina | Sem acesso | Sem acesso |
| Professor | Sem acesso | Sem acesso | Sem acesso |
| Secretaria | Sim | Sim | Sem acesso |

O JWT da pessoa, o vínculo ativo e as escolas concedidas são verificados pelo servidor. A equipe interna opera em rotas `/api/v1/admin/cameras/` e `/api/v1/admin/edge-devices/`, com `is_staff`, a permissão Django `cameras.support_camera_devices` e a organização selecionada explicitamente.

Veja o [contrato HTTP](CAMERA_API_ENDPOINTS.md), o [provisionamento](EDGE_DEVICES.md) e o [relatório da Fase 3](PHASE3_REPORT.md).
