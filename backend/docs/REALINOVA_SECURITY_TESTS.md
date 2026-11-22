# Testes de segurança e precisão do RealInova

O servidor monta um catálogo de ferramentas de leitura com parâmetros limitados. Cada execução consulta o vínculo, o papel e a escola no Django. Ferramentas usam seletores e agregações autorizados, e a resposta é montada com evidências conhecidas. A persistência mantém propriedade e escopo da conversa, com limite de contexto, custo e retenção.

Os testes de `apps/ai/test_real_inova.py` confirmam proveniência, tipos de ferramenta permitidos, limites de datas, ausência de dados, escopo de escola, troca de papel, propriedade de conversa, referências rejeitadas e erros do provedor redigidos. A suíte verifica que instruções presentes em dados e respostas do modelo não ampliam o catálogo ou a autorização. A nova regressão encerra a própria sessão enquanto a resposta simulada está em andamento e confirma que o conteúdo fica indisponível.

No fluxo HTTP de integração, 22 pratos foram registrados e consolidados. A consulta de cozinha devolveu 22 pratos, com uma conversa e duas mensagens persistidas. O ensaio HTTP separado do provedor simulado valida a interação com Agno. A amostra de precisão cobre as perguntas com dados sintéticos verificáveis e a resposta a evidência ausente. A qualidade com modelos reais e dados de homologação permanece uma validação operacional.

Veja [segurança do agente](REALINOVA_SECURITY.md) e [permissões](REALINOVA_PERMISSIONS.md).
