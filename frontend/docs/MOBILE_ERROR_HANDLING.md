# Estados e erros

As telas com dados remotos oferecem carregamento, vazio, atualização e recuperação de falhas. Uma leitura em cache pode ser exibida durante revalidação. Em falha de rede com dados ainda na memória, a mensagem de conexão acompanha os valores disponíveis. Uma negativa de autorização descarta a resposta em cache e revalida o vínculo. A troca de contexto cancela resultados e limpa o cache institucional.

| Estado | Comportamento |
| --- | --- |
| 400 e 422 | Preserva a mensagem ou os campos de validação seguros devolvidos pelo Django. |
| 401 | Em erros de sessão, tenta renovar uma vez. A perda de acesso confirmado volta ao login. |
| 403 e 404 | Mostra a restrição ou recurso indisponível e descarta a leitura correspondente. |
| 409 | Mantém o erro da operação. Serviços de merenda consultam seu estado novamente. |
| 429 | Informa o limite de uso e permite tentar novamente após a espera. |
| Falha de rede, timeout e 5xx | Apresenta o estado e permite recuperação apropriada. O chat distingue falhas conhecidas do provedor. |

Avisos de dados incompletos, câmera desconectada e convites aparecem nos fluxos correspondentes com dados retornados pelo backend. Notificação push fica pendente para a fase específica.
