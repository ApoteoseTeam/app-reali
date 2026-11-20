# Matriz de integração mobile

Na auditoria, a entrada Expo registrava diretamente o protótipo de perfil. As telas de login, gestão, cozinha, cardápio, relatório e perfil eram independentes. O Django já oferecia os contratos de autenticação, escopo, contagens, câmeras, merenda, analytics e RealInova. No perfil faltavam uma escrita autorizada de nome e um meio de consumir as capacidades efetivas de navegação. Ambos foram adicionados a `auth/me/`. A auditoria também identificou imports com diferenças de caixa e referências a assets ausentes na configuração Expo.

| Tela e integração inicial | Endpoint verificado | Integração entregue | Teste e status |
| --- | --- | --- | --- |
| Login, demonstração | `auth/login/`, `auth/refresh/`, `auth/logout/`, `auth/me/` | JWT, SecureStore, rotação, proteção de rota e logout | Cliente automatizado e Django. SecureStore nativo pendente de dispositivo. |
| Ativação e recuperação, sem rota mobile | `auth/invitations/verify/`, `auth/invitations/activate/`, `auth/password-reset/`, `/ativar/`, `/recuperar/` | Link, convite novo ou conta existente, senhas e fallback web | Contratos locais e configuração gerada. Publicação do domínio e abertura nativa pendentes. |
| Escolas e organizações, sem seletor | `organizations/`, `auth/me/schools/` | Seletor, preferência e cache com escopo | Cliente e API. Interação em aparelho pendente. |
| Início de gestão e cozinha, demonstração | `analytics/dashboard/` | Entradas, previsão, distribuição, desvio, serviços e qualidade | Cliente e API. Apresentação em aparelho pendente. |
| Contagens, sem navegação | `student-counts/`, `plate-counts/`, resumos e `count-adjustments/` | Período, câmera, serviço, detalhe e ajuste auditado | Contratos e dados de teste. Formulário nativo pendente. |
| Cardápio e edição, demonstração | `meal-services/`, `meal-schedules/`, snapshot, forecast e transições | Programação, geração e operação do serviço | Cliente e Django. Teste Maestro pendente. |
| Relatório e histórico, dados locais | `analytics/dashboard/`, `analytics/meal-services/`, `history/`, `organizations/summary/`, `schools/comparison/`, `reports/export/` | Filtros, comparação, gráfico e exportação | Contratos e PDF no cliente. Compartilhamento nativo pendente. |
| Funcionários e convites, sem tela conectada | `memberships/`, escolas, função, ativação e `invitations/` | Relações institucionais, envio, reenvio e revogação | Testes automatizados de contratos e validações do Django. Interação nativa pendente. |
| Câmeras, sem tela conectada | `cameras/`, status, histórico, ativação, identificação e configuração | Monitoramento, edição e parâmetros técnicos autorizados | Cliente e API. Hardware e UI nativa pendentes. |
| RealInova, balão demonstrativo | `ai/conversations/`, mensagens e `ai/chat/` | Chat, fontes, histórico e idempotência | Cliente e Django. Provedor contratado e Expo em aparelho pendentes. |
| Perfil, demonstração | `auth/me/`, `auth/change-password/`, `auth/logout/` | Dados de sessão, edição de nome, senha e saída | Contratos e API. Interação nativa pendente. |

A programação semanal representa os horários de serviço registrados. Avisos de câmera, dados provisórios e convites usam o estado dos seus respectivos endpoints. A API disponível nesta fase atende esses avisos no próprio fluxo operacional.
