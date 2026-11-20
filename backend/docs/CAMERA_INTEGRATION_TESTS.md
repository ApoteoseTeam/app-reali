# Testes da integração de câmeras

O escopo desta análise inclui `Camera`, `EdgeDevice`, `DeviceCredential`, histórico e contrato Django. `POST device/heartbeat/` e `GET device/configuration/` usam credenciais de agente, configuração versionada e escopo de escola. A ingestão usa `POST device/counts/` ou `device/counts/batch/` com ID estável, horário com offset, quantidade positiva e tipo compatível.

As suítes `apps/cameras/test_cameras.py` e `apps/counting/test_counting.py` exercitam autenticação, rotação/revogação, validade temporal, interrupção de vídeo, detector, atraso, ordenação de heartbeat, ausência de telemetria, isolamento, tolerância a reenvio e ingestão fora da ordem. Testes PostgreSQL cobrem alterações concorrentes de credencial, rechecagem sob lock, ingestão duplicada e ausência de escrita parcial.

O fluxo HTTP da Fase 10 envia heartbeat e contagens, repete o mesmo evento, verifica o total persistido, avança o relógio de teste, gera aviso offline e confirma recuperação com novo heartbeat. Falta de contagens por si só não determina o estado da câmera. [Contrato de ingestão](DEVICE_COUNT_API.md) · [Heartbeat](CAMERA_HEARTBEAT.md)
