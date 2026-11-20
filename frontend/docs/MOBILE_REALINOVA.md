# RealInova no app

O app cria e lista conversas em `ai/conversations/`, consulta as mensagens paginadas e envia perguntas por `POST ai/chat/`. Histórico e novas conversas respeitam o contexto selecionado. O app mostra carregamento, resposta em texto, fontes com intervalo e aviso quando identifica resultados provisórios. Arquivamento, reativação e exclusão usam as rotas da conversa.

Cada envio tem um UUID gerado com Expo Crypto. Após timeout, falha de rede ou resposta pendente, a recuperação usa o mesmo corpo e UUID enquanto a tela mantém o envio. Após reabrir o app, consulte o histórico persistido do servidor. Respostas de falha persistidas têm seus códigos apresentados. O histórico usa HTTP JSON e acompanha o último resultado pelo backend.

[Contrato do Django e exemplos JSON](../../backend/docs/REALINOVA_API.md)
