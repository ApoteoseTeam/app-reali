# Segurança do RealInova

- O aplicativo envia texto, identificadores de contexto e a chave opcional de idempotência. Campos para papel, ferramentas, permissões e configuração são recusados.
- Cada execução usa contexto próprio. O backend revalida vínculo, sessão e escopo no início, nas ferramentas e nos envios ao provedor. A propriedade e o escopo são conferidos antes de devolver o histórico ou o resultado.
- O catálogo de ferramentas contém consultas analíticas tipadas. Elas aceitam datas, opções enumeradas e UUIDs, consultam escolas autorizadas e têm limites de volume e de chamadas.
- O modelo recebe fatos compactos. Nomes cadastrados, notas de previsão, títulos, dados de usuário e identificadores de conversa ficam fora dos argumentos enviados ao LLM. O app deve tratar a resposta como texto.
- A saída do provedor precisa seguir um contrato de modo e referências. O Django constrói textos e fontes com as observações consultadas. Trechos livres enviados pelo modelo e referências inexistentes são recusados.
- Respostas usam `Cache-Control: private, no-store`. Os logs operacionais omitem prompts, respostas, notas, credenciais e corpos de falhas do SDK. Tentativas de acesso e falhas registram códigos estáveis.
- O chat recebe mensagens de até 2.000 caracteres e corpo JSON de até 12 KiB. A quantidade de consultas, o tamanho de cada envio ao provedor, as respostas do modelo e as cotas do banco têm limites independentes.

As proteções seguram a fronteira de autorização mesmo quando o modelo interpreta mal uma solicitação. A tentativa pode produzir uma consulta equivocada dentro do escopo permitido. A avaliação quantitativa do modelo real permanece dependente da conta selecionada.
