# Snapshots de entradas

O início do preparo fixa `reference_time`, também exposto como `cutoff_at`. A janela começa no `entry_window_start` do serviço. Serviços sem hora configurada usam a meia-noite local da data, preservando a política anterior. Configure horas distintas em serviços de turnos diferentes. A janela termina no primeiro entre o corte e o fim civil da data do serviço. Ambos os limites são inclusivos.

O total inclui entradas automáticas, lançamentos manuais legados e deltas pertinentes da Fase 4. A consulta exige que a ocorrência esteja dentro da janela e que o registro esteja disponível até o corte. A disponibilidade usa `DeviceIngestionEvent.received_at` ou `created_at` para contagens legadas. Ajustes usam sua criação. A leitura usa dados já confirmados no banco. Uma correção ou entrada tardia persistida depois disso serve para consultas e reconciliação posterior.

O snapshot preserva escola via serviço, janela, corte, total, ator, instante do último evento automático selecionado, componentes e evidências de telemetria. O resultado é imutável no fluxo operacional. As evidências detalhadas das câmeras ficam na persistência interna do snapshot.

| Qualidade | Regra |
|---|---|
| `COMPLETE` | Há pelo menos uma câmera ativa e todas as câmeras ativas do tipo esperado têm agente online, amostra operacional recente dentro da janela e nenhuma falha registrada no intervalo. |
| `PARTIAL` | Há evidência operacional de parte da cobertura, falha registrada durante a janela ou contagens úteis sem cobertura completa. |
| `STALE` | Há informação de desconexão por falta de comunicação e nenhuma amostra online adequada na janela. |
| `UNAVAILABLE` | Janela ainda fechada ou ausência de suporte operacional e de dados úteis. |
| `UNKNOWN` | Snapshot legado sem avaliação nesta versão. |

A avaliação é de cobertura observável. Uma entrada representa uma passagem e pode incluir reentrada. O snapshot orienta o planejamento de pratos e preserva os dados usados na decisão.
