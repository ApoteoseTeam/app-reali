# Cliente HTTP

`EXPO_PUBLIC_API_URL` recebe uma URL absoluta terminada em `/api/v1`. Builds publicados exigem HTTPS. O ambiente de desenvolvimento pode apontar para um servidor local compatível com a política de rede do dispositivo. Configure valores distintos para desenvolvimento, homologação e produção.

**Fluxo da requisição.** O cliente monta a URL e os filtros, anexa o Bearer token e, para endpoints institucionais, `X-Organization-ID`. O cancelamento combina o sinal da tela, o sinal do contexto e o timeout. As rotas usam barras finais para evitar redirecionamento. URLs de paginação precisam estar na mesma origem e abaixo do caminho da API.

O timeout padrão é 12 segundos. Exportações têm 30 segundos e o chat tem até 100 segundos para acompanhar o prazo do backend. Falhas de rede e timeout ficam disponíveis como códigos distintos. Retornos PDF e CSV são lidos como binário. O app aceita respostas de erro JSON do DRF e de RealInova.

Exemplo de filtro para um relatório:

```text
GET /api/v1/analytics/dashboard/?school=UUID&date=2026-11-19
Authorization: Bearer <access-token>
X-Organization-ID: <organization-uuid>
```

Use o backend para produzir datas de resposta, indicadores, permissões e transições. [Contratos do Django](../../backend/API_ENDPOINTS.md)
