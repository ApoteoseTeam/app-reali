# Permissões analíticas

As consultas exigem autenticação de sessão JWT, organização e vínculo ativos. `schools_for()` aplica o acesso institucional de `all_schools_access` ou as escolas autorizadas por `SchoolAccess`. Um vínculo da Secretaria segue as mesmas regras de escopo. Consultas históricas autorizadas também podem acessar a projeção de uma escola desativada. O recálculo pela API exige escola ativa.

| Papel | Diário, dashboard, histórico | Métricas de serviço | Institucional e exportação | Recálculo |
| --- | --- | --- | --- | --- |
| `DIRECTOR`, `ADMIN`, `MANAGER` | Sim | Sim | Sim | Sim |
| `NUTRITIONIST`, `SECRETARIAT` | Sim | Sim | Sim | 403 |
| `COOK` | Últimos 30 dias | Últimos 30 dias | 403 | 403 |
| `TEACHER` | Entradas nos últimos 30 dias | 403 | 403 | 403 |

Para professores, os totais de refeições e os metadados da consolidação geral são nulos, e a lista de serviços do dashboard vem vazia. A cobertura histórica contabiliza apenas projeções com entradas disponíveis, incluindo as legadas. Filtros de tipo ou status de refeição recebidos no dashboard ou no histórico retornam 400.

Um UUID de escola ou recurso fora do escopo retorna 404. Organização sem vínculo ativo ou papel insuficiente retorna 403. Um UUID inválido no filtro retorna 400. O recálculo e a exportação são auditados com escopo e período. Os limites de taxa usam o cache de throttling do DRF e são aplicados por usuário. Em múltiplas réplicas, use um cache compartilhado ou um limite equivalente no gateway para contagem global.
