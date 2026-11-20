# Segurança e isolamento

Os endpoints validam JWT, conta, organização, vínculo, papel atual e escolas. Consultas da central pertencem ao destinatário. O worker valida novamente destinatário, preferências e vínculo do dispositivo antes de enviar. A inscrição usa o JWT com vínculo à sessão e a prova de 256 bits guardada no SecureStore. Um token cadastrado em outra instalação não pode ser reivindicado só com o valor do token. Logout confirmado revoga apenas as inscrições daquela sessão.

O PostgreSQL guarda o token Expo criptografado com Fernet e o hash para unicidade. A instalação tem segredo separado e hash. Respostas REST e logs de tentativa usam IDs e códigos operacionais. As credenciais Expo e SMTP ficam no backend, e chaves APNs/FCM ficam na configuração do build e do provedor.

Push usa título e mensagem genéricos. O aplicativo valida o UUID, consulta o aviso com o contexto ativo e abre apenas destinos reconhecidos com autorização atual. No logout offline, o encerramento remoto pode aguardar conectividade. Um possível push pendente fica genérico e o servidor continua protegendo o acesso ao aviso.

Auditoria institucional exige direção ativa. Operadores da plataforma usam uma permissão Django independente e rota própria. Os detalhes retornados são uma lista de campos operacionais permitidos. Eventos de autorização registram somente metadados da rota e do ator autenticado.
