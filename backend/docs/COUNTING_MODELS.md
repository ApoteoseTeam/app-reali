# Modelos de contagem

`StudentCount` e `PlateCount` preservam UUID, câmera, incremento, fonte, horário original e ID externo. Pratos têm uma ligação obrigatória ao `MealService`. A classe abstrata `BaseCountModel` continua compartilhada. O registro original da câmera é somente leitura pela API.

`DeviceIngestionEvent` guarda a chave única por câmera e ID externo, o hash do conteúdo canônico, `recorded_at`, `received_at` e uma referência protegida à contagem do tipo correto. `CameraCountActivity` guarda uma linha por câmera, incluindo contadores e último evento confirmado. `CountAdjustment` acrescenta deltas auditáveis, preservando os registros originais.

A migration `counting.0003` cria as tabelas e preenche o registro central para contagens históricas com ID externo. O `created_at` histórico serve como melhor aproximação de `received_at`. Registros sem ID externo continuam disponíveis nos totais. Se um ID histórico estiver duplicado entre tipos para a mesma câmera, o backfill aborta com tudo preservado para investigação. Revise o plano e suspenda os escritores antigos durante a implantação para que o backfill cubra todas as linhas anteriores.

As listagens usam índices de timestamp e de câmera/horário ou serviço/horário já existentes. A unicidade central tem índice composto e os ajustes têm índice de escola, tipo e período. Os resumos agregam valores em SQL por janela e escopo. A reconstrução explícita de indicadores considera ajustes. O início de um novo preparo congela o valor ajustado já disponível naquele instante. Contagens atrasadas e ajustes posteriores preservam snapshots e previsões existentes.
