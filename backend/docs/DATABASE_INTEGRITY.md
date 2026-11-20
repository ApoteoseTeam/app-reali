# Integridade PostgreSQL

Foram revisados FKs, unicidade, índices operacionais, migrações e transações dos apps de conta, instituição, câmera, contagem, merenda, analytics, RealInova e notificações. O grafo de migrações foi verificado e aplicado em base local limpa. A auditoria da versão usa `makemigrations --check --dry-run`, `migrate --plan` e `migrate --noinput` no PostgreSQL isolado.

| Invariante | Mecanismo e evidência |
| --- | --- |
| Mesmo evento único | Ledger com unicidade, conteúdo canônico e gravação atômica. A corrida entre entregas e o rollback do ledger são testes PostgreSQL. |
| Escola da contagem e do serviço | Validação na ingestão e consultas escopadas pela câmera, escola e serviço. Ajustes preservam o original e validam o saldo antes de aplicar delta. |
| Um snapshot e uma previsão por refeição | Relações e locks no serviço. Os testes simultâneos confirmam um início, um snapshot e uma previsão. A finalização concorrente mantém um único evento de auditoria. |
| Uma consolidação por escola/dia | Unicidade e fila persistida. O teste de concorrência preserva a próxima atualização quando chega um evento durante o recálculo. |
| Entrega de aviso | Unicidade de evento por destinatário; concessão recuperável e `SKIP LOCKED` para processadores concorrentes. |
| Saída e sessão | Lock na conta coordena rotação, logout, registro push e revogação. A marca durável usa UUID de sessão. |

As travas não são simuladas por SQLite. Novas verificações de consistência administrativa usam o ORM e os mecanismos já adotados. O Reali restringe escritas ao serviço de domínio. A aplicação e as tarefas de manutenção usam papéis de banco que devem ser revisados na implantação.
