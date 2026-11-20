# Limites de uso e custos

Cada solicitação iniciada consome a cota diária no calendário local do Django. Os padrões são 25 por usuário e organização e 250 por organização. O throttling adicional do DRF limita picos por usuário. As reservas do PostgreSQL serializam por organização para aplicar as cotas entre réplicas. Um turno em andamento por conversa é permitido.

| Variável | Padrão |
| --- | ---: |
| `REALINOVA_DAILY_REQUEST_LIMIT` | 25 |
| `REALINOVA_ORG_DAILY_REQUEST_LIMIT` | 250 |
| `REALINOVA_USER_DAILY_BUDGET_MICROUSD` | 1.000.000 |
| `REALINOVA_ORG_DAILY_BUDGET_MICROUSD` | 10.000.000 |
| `REALINOVA_MAX_INPUT_BYTES` | 24.000 por chamada |
| `REALINOVA_MAX_OUTPUT_TOKENS` | 256 por chamada |
| `REALINOVA_MAX_TOOL_CALLS` | 6 por turno |

Um µUSD é um milionésimo de dólar. A reserva usa o teto de bytes submetidos como aproximação conservadora da entrada, os tokens de saída configurados, até duas chamadas de modelo além do limite de ferramentas por provedor e as tarifas cadastradas. Inclui a alternativa quando habilitada. O consumo observado na resposta da API substitui a reserva nas chamadas que informam tokens. Cada chamada sem medição retém uma estimativa conservadora. Os campos de tokens omitem valores desconhecidos e indicam quando só parte das chamadas foi medida.

Consultas diretas utilizam a cota de requisições com custo de provedor zero. Reenvios idempotentes preservam a cobrança original. O teto depende dos preços configurados e dos limites respeitados pelo provedor. A cobrança da conta pode incluir preços, descontos, moedas e tarifas que a aplicação não acompanha. Use a [API de utilização](REALINOVA_API.md) para acompanhar o orçamento interno.
