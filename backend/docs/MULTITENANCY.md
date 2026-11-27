# Organizações, escolas e migração

Rotas institucionais usam `X-Organization-ID` com o UUID da organização selecionada. O servidor resolve o vínculo ativo do usuário e exige organização ativa. O modelo `SchoolAccess` concede escola a escola, com unicidade e validação de organização. `all_schools_access` é uma concessão explícita usada para todas as escolas presentes e futuras da organização. Uma lista vazia de concessões restritas significa ausência de acesso.

Os querysets de escolas, câmeras, refeições, contagens e métricas aplicam o escopo antes de localizar o objeto. Uma escola de outra organização nunca passa pelo filtro. A API usa `404` para detalhes fora do escopo, `403` quando falta autorização e uma página vazia para filtros de leitura sem resultados. A lista de seleção no app mostra somente escolas ativas. O histórico de escolas desativadas continua acessível aos papéis e vínculos autorizados. Novas operações de preparo, gerenciamento de equipamentos/serviços, concessões e reconstrução de métricas exigem escola ativa.

O gestor restrito administra vínculos e convites de outros cargos quando estão inteiramente contidos em seu escopo. Gestores com acesso institucional podem atribuir o cargo de gestor e conceder acesso institucional. Substituir escolas exige enviar o conjunto inteiro no PUT. O último gestor ativo e o último gestor ativo com acesso institucional são protegidos. Desativar o vínculo corta o acesso dessa organização sem desativar a conta global.

## Dados legados

- O ID de usuário continua numérico. Organizações, vínculos, escolas e convites continuam com UUID.
- A migration normaliza e-mails e bloqueia colisões com os IDs envolvidos, para conciliação manual. Ela não mescla contas.
- As migrações anteriores converteram vínculos `ADMIN` em `DIRECTOR` com acesso institucional explícito. As migrações `0005_merge_director_into_manager` convertem vínculos e convites `DIRECTOR` para `MANAGER`, preservando IDs, estados, escolas e tokens.
- Convites legados para administradores preservam o escopo institucional. Se houver mais de um convite válido para o mesmo endereço e organização, apenas o mais recente continua pendente. Convites pendentes sem escopo de escola são revogados, e os expirados são classificados como expirados. Os registros permanecem para consulta.
- Faça backup antes de implantar e execute `python manage.py migrate` com a versão nova do backend. Coordene a troca de versão para que os processos anteriores sejam substituídos quando a migração for aplicada. Para voltar à versão anterior, restaure o backup com os cargos originais.
