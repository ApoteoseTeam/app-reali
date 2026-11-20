# Configuração de provedores

Instale as dependências de `backend/requirements.txt` e aplique `python manage.py migrate`. O RealInova fica desligado por padrão. Configure as variáveis na implantação, com a chave em um gestor de segredos. O exemplo usa valores vazios para a conta e suas tarifas.

```dotenv
REALINOVA_ENABLED=true
REALINOVA_PROVIDER=openai
REALINOVA_MODEL=
REALINOVA_API_KEY=
REALINOVA_INPUT_USD_PER_MTOK=
REALINOVA_OUTPUT_USD_PER_MTOK=
REALINOVA_REQUEST_TIMEOUT_SECONDS=25
REALINOVA_MAX_OUTPUT_TOKENS=256
REALINOVA_MAX_INPUT_BYTES=24000
REALINOVA_MAX_TOOL_CALLS=6
REALINOVA_FALLBACK_ENABLED=false
```

Configure um modelo de Chat Completions com suporte a ferramentas. A opção `openai` tem URL padrão do provedor. Para `openai_compatible`, informe `REALINOVA_BASE_URL` com a raiz compatível e verifique suporte a ferramentas, `max_completion_tokens` e `store=false`. `REALINOVA_TEMPERATURE` é opcional e deve ser omitida para modelos que não a aceitam. Em produção, a URL precisa usar HTTPS. HTTP loopback é aceito em desenvolvimento para a simulação.

O fallback pode ser habilitado explicitamente para um segundo modelo ou endpoint aprovado. Configure todas as opções de provedor, modelo, URL quando aplicável, chave e tarifas usando `REALINOVA_FALLBACK_`. Há uma tentativa alternativa em indisponibilidade temporária, timeout que deixe orçamento de tempo ou limite do provedor. Erros de credencial e resposta fora do contrato encerram a execução. As chamadas usam timeout de rede e limite de quantidade. Há controle do tempo restante antes de cada chamada.

A chave permanece no backend. A opção de envio `store=false` é configurada no cliente. Verifique a política de tratamento e retenção de dados da conta e de cada provedor aprovado antes de habilitá-lo.
