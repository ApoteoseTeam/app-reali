# Permissões do planejamento

Todas as rotas exigem JWT e `X-Organization-ID` válido. O servidor resolve o vínculo ativo, as escolas concedidas e o papel. Recursos fora do escopo ficam fora das listas e retornam `404` em consulta direta. Escola inativa bloqueia novas operações e preserva o histórico autorizado.

| Papel | Ler serviços, snapshots e previsões | Operar preparo e distribuição | Criar, editar, gerar ou cancelar | Configurar política de taxa |
|---|---|---|---|---|
| Direção | Sim | Sim | Sim | Sim |
| Gestão | Sim | Sim | Sim | Sem acesso |
| Nutrição | Sim | Sem acesso | Sem acesso | Sem acesso |
| Cozinha | Últimos 30 dias em escolas concedidas | Sim | Sem acesso | Sem acesso |
| Professor | Sem acesso | Sem acesso | Sem acesso | Sem acesso |
| Secretaria | Sim | Sem acesso | Sem acesso | Sem acesso |

Direção e gestão podem fornecer a taxa explícita de preparo. A cozinha recebe a previsão e a quantidade de amostras, com restrição dos detalhes históricos além do escopo operacional. Snapshot e previsão originais têm rotas de leitura. Mudanças de programação, política, serviço, início, cálculo, distribuição, fim e cancelamento geram auditoria.
