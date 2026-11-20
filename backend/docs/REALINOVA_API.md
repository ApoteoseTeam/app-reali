# API do RealInova

Prefixo `/api/v1/ai/`. Todas as rotas exigem `Authorization: Bearer <access_token>` da autenticação do Reali e `X-Organization-ID`. Envie JSON para escritas. As listas usam `count`, `next`, `previous` e `results` com páginas de 50.

| Método e caminho | Retorno |
| --- | --- |
| `POST chat/` | Envia uma pergunta e devolve o resultado ou a execução em andamento. Cria uma conversa quando `conversation_id` é omitido. |
| `GET conversations/` | Conversas autorizadas do proprietário. |
| `POST conversations/` | Cria conversa com `title` e `school_id` opcionais. |
| `GET conversations/{id}/` | Metadados da conversa. |
| `PATCH conversations/{id}/` | Atualiza `title` ou `status`. Estados `ACTIVE` e `ARCHIVED`. |
| `DELETE conversations/{id}/` | Exclui a conversa e as mensagens retidas. Retorna 204. |
| `GET conversations/{id}/messages/` | Mensagens, estados, erros e fontes em ordem cronológica. |
| `GET usage/` | Cotas do dia local, consumo próprio e, quando autorizado, consumo agregado. |

## Envio no React Native

```json
{
  "conversation_id": "e5e32eb1-d644-43e1-9654-5f95166cef47",
  "school_id": "f6f46dc4-1683-4d1f-830a-fa5c2e517d6f",
  "client_request_id": "7cf8d027-a061-419a-961b-94edf008a72b",
  "message": "Quantos pratos foram servidos ontem?"
}
```

`organization_id` é opcional no corpo e precisa coincidir com o cabeçalho. `school_id` é opcional. Quando o turno continua uma conversa de escola, o valor informado precisa ser a mesma unidade. O texto aceita até 2.000 caracteres.

Exemplo sintético de resposta direta:

```json
{
  "conversation_id": "e5e32eb1-d644-43e1-9654-5f95166cef47",
  "message_id": "709d01d7-55e5-45bd-8e04-3017a7d49618",
  "status": "COMPLETED",
  "answer": "Escola selecionada — 18/11/2026\npratos servidos 375 · cobertura 1/1 · dados provisórios · sujeitos a atualização após sincronização ou revisão.",
  "sources": [
    {
      "ref": 1,
      "type": "PLATE_COUNTS",
      "school_id": "f6f46dc4-1683-4d1f-830a-fa5c2e517d6f",
      "period": {"start_date": "2026-11-18", "end_date": "2026-11-18"},
      "rows": [{"data_status": "PROVISIONAL", "stale": false, "calculated_at": "2026-11-18T17:00:00Z"}],
      "truncated": false
    }
  ],
  "usage": {"input_tokens": null, "output_tokens": null, "token_usage_complete": null},
  "error": null,
  "replayed": false
}
```

Use `message_id` como chave da resposta. Mostre carregamento após o envio. Em caso de desconexão, reenvie o mesmo corpo com o mesmo `client_request_id` e consulte mensagens pelo UUID da conversa. Uma repetição enquanto a execução está ativa devolve 202 e `PENDING`. Depois da conclusão, o reenvio devolve a mensagem persistida. Em uma nova tentativa intencional após falha, use outro identificador. Renderize a resposta como texto e mostre as fontes quando presentes.

A Fase 7 usa HTTP JSON convencional. Tokens parciais via streaming exigiriam testes de cancelamento, buffering do proxy e reconexão do Expo. O histórico e a idempotência cobrem a recuperação na API entregue.

## Erros

Falhas anteriores à reserva usam `{"error":{"code":"...","message":"..."}}`. Quando o turno já existe, a resposta de falha traz seus IDs com `status=FAILED` e `error`. O chat também pode concluir com `AI_DATA_UNAVAILABLE` ou uma negativa de escopo da própria pergunta explicada em `answer`.

| Código | HTTP |
| --- | --- |
| `AI_AUTHENTICATION_REQUIRED` | 401 |
| `AI_INVALID_MESSAGE` | 400, ou 415 para mídia incompatível |
| `AI_PERMISSION_DENIED` | 403 para contexto inválido. 200 para negativa em uma resposta concluída. |
| `AI_CONVERSATION_NOT_FOUND` | 404 |
| `AI_CONVERSATION_ARCHIVED`, `AI_CONVERSATION_BUSY`, `AI_REQUEST_CONFLICT` | 409 |
| `AI_RATE_LIMITED`, `AI_COST_LIMIT` | 429. Respeite `Retry-After` quando presente. |
| `AI_PROVIDER_INVALID_RESPONSE` | 502 |
| `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_AUTH_FAILED`, `AI_PROVIDER_RATE_LIMITED`, `AI_TOOL_ERROR`, `AI_PERSISTENCE_ERROR` | 503 |
| `AI_TIMEOUT` | 504 |
| `AI_DATA_UNAVAILABLE`, `AI_INVALID_ARGUMENTS` | 200 em respostas explicativas. |

A seleção de escolas pode usar `GET /api/v1/auth/me/schools/` com o cabeçalho institucional. [Permissões e regras de continuidade](REALINOVA_PERMISSIONS.md)
