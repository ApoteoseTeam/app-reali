# Relatório de entrega da Fase 3

O módulo Django administra câmeras e agentes, autentica o software local e separa conexão do agente de saúde de cada câmera. A verificação de integração usou requisições Python simuladas sobre HTTP local. A leitura física de vídeo e a integração com o software de visão existente ficam para a Fase 4.

## Implementação

- `Camera` foi ampliada com associação a `EdgeDevice` e a última amostra operacional. Foram adicionados `EdgeDevice`, `DeviceCredential`, `CameraConfiguration` e `CameraHealthEvent`.
- A migration `cameras.0002_camera_detector_status_camera_health_status_and_more` preserva IDs, escolas, tipos, horários e chaves legadas. As tabelas novas adicionam unicidade, validade de FPS, versão positiva e uma credencial ativa por agente.
- `apps/cameras/authentication.py` autentica agentes e aplica limites. `provisioning.py` coordena cadastro, configuração, credenciais e auditoria. `monitoring.py` valida escopo no heartbeat, mantém a amostra atual e registra apenas transições. O comando `maintain_camera_health` materializa o histórico offline e aplica retenção.
- `apps/cameras/views.py` e `serializers.py` entregam APIs humanas e de dispositivo. A autorização usa os vínculos da Fase 2 e a permissão separada de suporte interno. O código do cliente de referência fica no teste Python `test_python_reference_io_over_http` e há um exemplo de comunicação no [contrato HTTP](CAMERA_API_ENDPOINTS.md).
- `/device/counts/` continua com o contrato legado para câmeras sem agente. A primeira associação revoga a chave antiga da câmera. O token do novo agente autentica heartbeat e configuração nesta fase.

## Evidências

| Estado | Verificação | Resultado |
|---|---|---|
| Validado | Gerenciamento e escopo | Câmeras da portaria e cantina, mais de uma câmera por agente, validação da escola, papéis, suporte separado, ativação e desativação. |
| Validado | Credenciais | Emissão única com confirmação de senha, hash, expiração, rotação, revogação, separação JWT e limite de falhas. |
| Validado | Telemetria e configuração | Cinco estados operacionais, distinção agente/câmera, histórico de transições, retenção, validação e controle de versões. |
| Validado | Cliente Python de referência | Requisições HTTP reais a um Django de teste para heartbeat e configuração com duas câmeras simuladas. |
| Validado | PostgreSQL 18 isolado | 29 testes aprovados, incluindo heartbeat concorrente, ordenação e revogação ou rotação durante a requisição. |
| Validado | SQLite | 24 testes aprovados e cinco cenários de locks reservados ao PostgreSQL. |
| Validado | Migrações | Plano revisado e migration aplicada somente em cópias isoladas e bancos de teste. O plano posterior ficou vazio. A atualização de uma cópia com câmera e credencial legadas preservou os dados e o heartbeat autenticado. |
| Validado | Qualidade e contrato | `manage.py check`, `makemigrations --check --dry-run`, Ruff, formato e OpenAPI com `--fail-on-warn`. |
| Validado com ressalva | `manage.py check --deploy` | Somente `security.W004` de HSTS. O domínio e o TLS precisam ser confirmados antes de habilitá-lo. |
| Não verificado | Postman CLI | A versão instalada não oferece o comando `postman status`. A evidência HTTP veio da suíte DRF e do teste Python contra o servidor. |
| Não verificado | Infraestrutura externa | Câmeras físicas, software de visão existente, publicação HTTPS, cache compartilhado e agendamento em homologação ou produção. |

## Passagem para a Fase 4

Integre as contagens pelo token de agente com seleção explícita da câmera, idempotência persistente e contrato de reenvio. Mantenha câmeras que ainda enviam contagens pelo contrato legado sem associação até que exista uma janela de transição. A equipe pode configurar TLS, cache e execução periódica do comando de retenção no ambiente de homologação usando o [guia de heartbeat](CAMERA_HEARTBEAT.md).
