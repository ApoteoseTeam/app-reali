# Conversas, mensagens e retenção

- `AIConversation` guarda proprietário, organização, escola opcional, papel, escopo, título, estado e datas. Escola e organização são fixas. Crie uma conversa para mudar de escopo.
- `AIMessage` guarda as mensagens do usuário e do assistente com estado, conteúdo, fontes e eventual código de erro. O backend atribui os papéis. Os resultados aparecem em ordem cronológica.
- `AIExecution` guarda idempotência, utilização, custo reservado, latência, provedores e ferramentas usados, status e erro. Nenhum prompt é copiado para a telemetria.

O histórico da tela inclui todas as mensagens retidas e autorizadas. A interpretação recebe até três perguntas anteriores de conversas bem-sucedidas, com até 1.000 caracteres de cada uma. Dados da resposta anterior precisam ser consultados novamente para sustentar números atuais.

Arquivar impede novos turnos. Reativar permite continuar. Excluir remove a conversa e suas mensagens, registra a operação no audit log e mantém os metadados de utilização até expirar a retenção. Se houver um turno em andamento, a alteração e a exclusão retornam conflito. Um envio repetido com o mesmo `client_request_id` devolve a execução original e evita novas cobranças pelo mesmo pedido. Envie o mesmo corpo original no reenvio, inclusive omissões.

Pelo padrão, conversas expiram 30 dias após criação, e a telemetria 90 dias após a execução. Agende `python manage.py prune_realinova` na implantação. O comando processa lotes, remove itens vencidos e marca execuções interrompidas como falhas depois de três minutos. Com falha após o envio ao provedor e antes de persistir a resposta, a execução recuperada conserva a reserva de custo. Uma solicitação com outro identificador pode iniciar novo turno.
