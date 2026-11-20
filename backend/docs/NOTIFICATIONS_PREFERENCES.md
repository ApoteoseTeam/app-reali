# Preferências de notificações

Cada usuário controla seus canais por organização e tipo. O padrão é central in-app habilitada, push e e-mail desabilitados. As respostas da API incluem `required_in_app`, `push_available` e `email_available`. A atualização da própria conta pode desativar canais opcionais. A atualização de vínculo permanece na central dos usuários ativos, e comunicações obrigatórias da conta permanecem no fluxo de segurança existente.

Uma mudança de preferência afeta novos avisos e entregas externas pendentes. Avisos já exibidos permanecem no histórico até arquivamento ou retenção. Um aviso com a central desabilitada fica fora de lista e contador, mas pode ser aberto via UUID autorizado recebido por push. Push requer também permissão do sistema operacional e inscrição ativa no dispositivo.
