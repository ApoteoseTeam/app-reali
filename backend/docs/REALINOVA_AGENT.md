# Agente RealInova

A implementação usa o Agno 2.9.0 com `Agent`, `OpenAIChat` e ferramentas tipadas vinculadas a um contexto de execução. Uma instância é criada por tentativa de provedor. A telemetria e os logs internos do SDK ficam desativados. O Django registra metadados próprios da execução.

O modelo recebe as ferramentas autorizadas, a pergunta, a data local de referência e até três perguntas anteriores. O retorno aceito é JSON com um modo de resposta e índices numéricos das pesquisas realizadas no turno. O Django valida os índices e monta o texto e as fontes. Explicações de fórmulas e limites de dados usam textos revisados. O modo de planejamento combina evidências consultadas com orientação sobre cobertura, amostra e revisão de parâmetros.

Perguntas simples reconhecidas sobre entradas, pratos previstos ou servidos hoje ou ontem seguem direto para a consulta. Algumas perguntas explicativas também são respondidas localmente. Consultas sem observações distinguem indisponibilidade de zero contabilizado. Dados pendentes, parciais ou provisórios carregam um aviso de atualização.

O desvio compara previsão e distribuição. Eventos de entrada podem incluir entradas repetidas. O agente informa a ausência de dados quando perguntado sobre presença individual, saídas ou desperdício de alimentos.

Consulte a [referência do Agent](https://docs.agno.com/reference/agents/agent), a [versão fixada do Agno](https://pypi.org/project/agno/2.9.0/) e as [fórmulas da Fase 6](ANALYTICS_FORMULAS.md).
