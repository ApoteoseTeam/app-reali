# Permissões do RealInova

Todo acesso exige JWT de sessão e `X-Organization-ID`. O backend confere a sessão do usuário, a organização, o vínculo ativo, o papel atual, `all_schools_access`, os vínculos `SchoolAccess` e a atividade das escolas. Quando o corpo de chat também inclui `organization_id`, ele precisa corresponder ao cabeçalho.

| Papel | Escopo efetivo |
| --- | --- |
| DIRECTOR, MANAGER, NUTRITIONIST, SECRETARIAT | Indicadores e comparações dentro das escolas ativas autorizadas. Comparação entre escolas exige uma conversa no escopo institucional. |
| COOK | Indicadores e serviços dos últimos 30 dias em uma escola autorizada. |

Quando um usuário com papel COOK possui uma única escola, ela é selecionada automaticamente ao criar uma conversa sem `school_id`. Com mais de uma, indique a unidade. Os perfis institucionais podem omitir a unidade para consultar seu conjunto autorizado. Apenas direção com acesso institucional amplo recebe os totais de utilização da organização em `GET /ai/usage/`. Os demais papéis consultam sua própria utilização.

A conversa vinculada a escola continua limitada à unidade escolhida. A conversa institucional resguarda o conjunto de escolas permitido no momento da criação. Uma mudança no papel, no conjunto institucional de escolas ou na autorização da escola vinculada torna o conteúdo indisponível. A validação também ocorre na ferramenta e antes da entrega da resposta. O proprietário com vínculo ativo pode apagar um histórico que perdeu autorização de ler.
