# Fase 8 do Reali

A integração usa os contratos das Fases 1 a 7. O Expo Router organiza as telas reaproveitadas e protege a navegação. O cliente usa JWT e contexto de organização e escola, consulta os dados reais do Django e envia operações de acordo com as permissões do backend.

## Inventário

| Área | Alterações |
| --- | --- |
| Expo e navegação | Configuração e dependências do SDK, `app.config.ts`, `app.json`, `eas.json`, entrada e rotas em `src/app`. |
| Integração e sessão | Criados `src/api`, `src/session`, `src/hooks` e os fluxos organizados em `src/features`. |
| Telas reaproveitadas | Login, início de gestão e cozinha, cardápio e edição de programação, relatório diário e perfil. |
| Django | `access_serializers.py` e `access_views.py` expõem capacidades da sessão e edição do nome próprio em `auth/me/`. |
| Validação e operação | Testes de cliente, fixture de integração, fluxo Maestro, configuração do lint, gerador de arquivos de associação e variáveis Expo de exemplo. |
| Documentação | Doze guias mobile e este relatório. |

[Endpoints e estado por tela](MOBILE_SCREEN_INTEGRATION.md) · [Como executar e testar](MOBILE_TESTS.md) · [Ativação e builds](MOBILE_ANDROID_IOS.md)

## Estado da entrega

- **Implementado e validado no ambiente local.** Cliente HTTP, autenticação, isolamento, integração com o Django, configuração Expo, esquema OpenAPI e os contratos apresentados na matriz. [Resultados e reprodução](MOBILE_TESTS.md)
- **Implementado com validação nativa pendente.** Interface em Android e iOS, SecureStore, compartilhamento de PDF e CSV, suspensão, teclado e links assinados. O fluxo Maestro acompanha a entrega. [Validação em aparelho](MOBILE_ANDROID_IOS.md)
- **Dependências de operação.** A publicação precisa configurar a URL HTTPS, publicar as associações do domínio com as assinaturas efetivas e disponibilizar o provedor aprovado do RealInova. A entrega de convites por um domínio real e a notificação push dependem do ambiente ou da fase de notificações.
