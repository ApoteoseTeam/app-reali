# Auditoria e estabilização do backend Reali

## Estado inicial

O backend tinha sete apps de domínio e uma API REST em desenvolvimento, com JWT, solicitações institucionais, convites, credenciais de câmera e operações de merenda. O checkout tinha oito migrations versionadas removidas localmente. O app `api` já declarava três modelos sem migration. O SQLite existente continha as tabelas dos apps de domínio. O frontend inspecionado não tinha chamadas explícitas à API em `frontend/src`. A documentação do backend descrevia um estado anterior sem API, e não havia suíte automatizada ou configuração de CI versionada.

## Achados por gravidade

| Gravidade | Achado e impacto | Tratamento |
|---|---|---|
| Crítico para operação | Histórico ausente no checkout impedia reproduzir o esquema, e faltava uma migration para as três tabelas da API. | Restauradas as oito migrations da versão atual e adicionada `api.0001_initial`. Instalação limpa PostgreSQL e atualização de cópia do SQLite validadas. |
| Alto | Configuração de produção podia herdar chave de desenvolvimento, SQLite e cookies sem marcação segura. | Com `DJANGO_DEBUG=false`, chave, hosts e PostgreSQL são obrigatórios. Redirecionamento HTTPS e cookies seguros são habilitados. Cabeçalho de proxy é opt-in. |
| Alto | Reenvios podiam falhar na validação do modelo antes da constraint, ou ser rejeitados após finalizar o serviço. Alterar a identidade cadastral de uma câmera podia reatribuir contagens históricas. | Consulta idempotente antes da gravação, comparação de todo o conteúdo relevante, locks PostgreSQL e bloqueio de alteração de tipo/escola para câmeras com contagens. |
| Alto | O esquema autoriza por organização. Um membro ativo pode ler todas as escolas da organização selecionada. | Isolamento entre organizações e papéis atuais validados. Para ambientes que exigem lotação por escola, a ausência do vínculo granular bloqueia a liberação desses perfis. |
| Médio | UUIDs e datas malformados podiam causar 500. O código de escola já usado carecia de erro de validação no fluxo usual. | Validação no limite da API e filtros, rota de detalhe tipada e validação do código na organização. A unicidade continua garantida no banco. |
| Médio | A razão de previsão padrão era uma string e a consulta incluía entradas de dias seguintes ao iniciar um serviço retroativo. | Razão padrão Decimal e intervalo limitado à data local do serviço e ao início do preparo. |
| Médio | A ativação aceitava convites de organizações inativas. O envio podia usar um endereço fictício, e endpoints públicos careciam de limites. | Verificação da organização e da URL de ativação, SMTP por configuração e limites DRF para login, ativação e solicitação institucional. Limites distribuídos e configuração de e-mail real ainda exigem validação de implantação. |
| Baixo | Paginação com ordenação instável e contrato desatualizado. | Ordenação determinística, Swagger/OpenAPI restrito a desenvolvimento e documentação alinhada aos endpoints. |

## Arquitetura, integridade e compatibilidade

- `core` fornece UUIDs, timestamps e a base de contagens. `users` mantém contas e vínculos únicos por usuário/organização. Mantivemos o ID numérico da conta por compatibilidade. `institutions` mantém organizações e escolas, com código único dentro da organização.
- `cameras` associa o dispositivo a uma escola. `counting` conserva contagens positivas, unicidade por câmera e ID de evento e validação de tipo e escola. Há índices para timestamp, câmera/data e serviço/data. Alterações diretas via SQL, operações bulk e edição fora dos fluxos da API exigem revisão das invariantes entre tabelas.
- `meals` controla transições e vínculo um-para-um da base congelada e da previsão com o serviço. `analytics` mantém uma consolidação por escola/dia. Sua atualização ainda é manual por endpoint. A base de previsão usa entradas detectadas. As contagens de pratos representam entregas, e a diferença para a previsão não é medida de desperdício.
- `api` concentra os contratos, a autorização, as operações transacionais e os modelos auxiliares. A autenticação humana usa JWT e a dos dispositivos usa credencial independente. O acesso ao banco e aos backups deve ser restrito, inclusive porque a blacklist do Simple JWT mantém registros de tokens emitidos.
- As URLs e os formatos principais da API v1 permanecem compatíveis com o contrato existente. Os ajustes observáveis de validação, limites e idempotência constam de [API_ENDPOINTS.md](../API_ENDPOINTS.md). CORS continua dependente do ambiente web. Os clientes nativos usam HTTPS e cabeçalhos de autenticação.

## Evidência de verificação

| Estado | Verificação | Resultado |
|---|---|---|
| Validado | `python manage.py check` | Sem problemas. |
| Validado | `python manage.py makemigrations --check --dry-run` | Sem divergências de models. |
| Validado | `python manage.py migrate --plan` e `migrate --noinput` | Aplicação em PostgreSQL 18 isolado; plano posterior vazio. Em uma cópia do SQLite existente, somente API e blacklist estavam pendentes e foram aplicadas. |
| Validado | `python manage.py test` com PostgreSQL e `python -m pytest -q` com SQLite | Seis testes passam em cada banco, cobrindo JWT, papéis, isolamento, validação, ingestão, constraints, previsão e convites. Após corrigir a montagem dos cabeçalhos no cliente de teste, os dois runners passaram. |
| Validado | `ruff check .` e `ruff format --check apps/api config/settings.py config/urls.py` | Lint do backend e formato dos arquivos da API e configuração. |
| Validado | `python manage.py spectacular --validate --fail-on-warn` | Schema gerado e validado. |
| Validado com ressalva | `python manage.py check --deploy` em configuração de produção simulada | Aviso `security.W004` para HSTS, mantido desativado até validar domínio e HTTPS. |
| Não verificado | Postman CLI, SMTP real, aplicativos nativos, câmeras reais, proxy/TLS e banco de implantação | O CLI instalado não oferece `postman status`. A API foi exercitada pelo cliente de testes DRF. Os serviços reais exigem ambiente e credenciais próprios. |

A versão executada foi Django 5.2.19. A dependência permanece na série 5.2 para que a instalação siga a série validada. A validação aplicou migrations somente à instância PostgreSQL isolada, bancos de teste e cópia do SQLite. Nenhum deploy foi executado.

## Prontidão para a Fase 2

O backend pode seguir para desenvolvimento da Fase 2 em ambiente local. A liberação para instituições depende da definição de acesso por escola, do provisionamento institucional e da validação do ambiente de implantação.

1. Implementar aprovação e provisionamento explícitos pela equipe Reali, incluindo vínculo inicial e trilha de auditoria. Completar convites para contas existentes, revogação, reenvio e fluxo web de ativação com SMTP. A ativação de conta nova usa token de uso único com expiração.
2. Definir o vínculo usuário/escola e as exceções de acesso para perfis institucionais. Cobrir leitura, escrita, relatórios e operações de merenda em cada papel.
3. Definir provisionamento e rotação de credenciais de câmeras e o tratamento da primeira entrega de eventos após o encerramento. Validar relógio dos dispositivos, alarmes de heartbeat e concorrência sob carga.
4. Integrar o RealInova por funções de leitura de contagens e indicadores já escopadas e autorizadas pelo backend. A ferramenta deve receber escola e organização resolvidas pela autorização; a consulta livre ao banco fica fora desse contrato.
5. Validar SMTP, TLS, proxy, backup e restore, limitar tráfego no ambiente de implantação e adicionar uma execução recorrente da suíte com PostgreSQL no CI. Executar o [guia local](../README.md) para reproduzir as verificações.
