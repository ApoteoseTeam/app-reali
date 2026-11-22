# Organizações, escolas e migração

Rotas institucionais usam `X-Organization-ID` com o UUID da organização selecionada. O servidor resolve o vínculo ativo do usuário e exige organização ativa. O modelo `SchoolAccess` concede escola a escola, com unicidade e validação de organização. `all_schools_access` é uma concessão explícita usada para todas as escolas presentes e futuras da organização. Uma lista vazia de concessões restritas significa ausência de acesso.

Os querysets de escolas, câmeras, refeições, contagens e métricas aplicam o escopo antes de localizar o objeto. Uma escola de outra organização nunca passa pelo filtro. A API usa `404` para detalhes fora do escopo, `403` quando falta autorização e uma página vazia para filtros de leitura sem resultados. A lista de seleção no app mostra somente escolas ativas. O histórico de escolas desativadas continua acessível aos papéis e vínculos autorizados. Novas operações de preparo, gerenciamento de equipamentos/serviços, concessões e reconstrução de métricas exigem escola ativa.

A direção restrita administra vínculos e convites inteiramente contidos em seu escopo, sem privilégios de direção sobre outros vínculos. Diretores com acesso institucional podem conceder privilégios institucionais. Substituir escolas exige enviar o conjunto inteiro no PUT. O último diretor ativo e o último diretor ativo com acesso institucional são protegidos. Desativar o vínculo corta o acesso dessa organização sem desativar a conta global.

## Dados legados

- O ID de usuário continua numérico. Organizações, vínculos, escolas e convites continuam com UUID. A API aceita `ADMIN` como alias de entrada para `DIRECTOR`.
- A migration normaliza e-mails e bloqueia colisões com os IDs envolvidos, para conciliação manual. Ela não mescla contas.
- Vínculos `ADMIN` passam a `DIRECTOR` com acesso institucional explícito. Demais vínculos legados permanecem ativos, mas precisam receber suas escolas ou concessão institucional antes de ler ou operar dados das unidades.
- Convites legados para administradores preservam o escopo institucional. Se houver mais de um convite válido para o mesmo endereço e organização, apenas o mais recente continua pendente. Convites pendentes sem escopo de escola são revogados, e os expirados são classificados como expirados. Os registros permanecem para consulta.
- Revise a atribuição de escolas e faça backup antes de migrar um ambiente existente. A reversão de esquema não restaura os papéis, e-mails e estados legados que foram normalizados.
