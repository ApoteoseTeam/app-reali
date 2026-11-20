# Escopo multi-tenant

A lista de organizações vem de `GET organizations/` e é cruzada com os vínculos ativos de `GET auth/me/`. A lista de escolas ativas autorizadas vem de `GET auth/me/schools/`. Se houver apenas uma opção de contexto, o app pode selecioná-la automaticamente. Se houver várias, a pessoa escolhe organização e escola. A preferência por usuário guarda os UUIDs no SecureStore e é revalidada na abertura.

A seleção cancela as requisições institucionais anteriores e descarta o cache do contexto. As consultas de detalhes de serviço, câmera e conversa conferem também a escola escolhida. A visão institucional usa os agregados autorizados pelo Django.

As capacidades de `memberships[].capabilities` orientam botões e rotas. Alterações de acesso são verificadas ao voltar ao app e quando uma consulta retorna 403. O servidor pode negar uma ação entre a exibição e a confirmação. O app atualiza o contexto quando o vínculo ou a escola deixa de estar disponível.
