# Arquitetura mobile

O Reali usa Expo SDK 58, React Native, TypeScript e Expo Router. A entrada passa pelo layout raiz em `src/app`, que mantém o navegador ativo enquanto valida a sessão. As rotas institucionais ficam em `(private)`. As telas de escola exigem uma seleção ativa e, quando aplicável, uma capacidade informada pelo Django.

| Área | Implementação |
| --- | --- |
| `src/api` | HTTP, erros, paginação, contratos TypeScript e endpoints da Fase 8. |
| `src/session` | Credenciais, inicialização, contexto institucional e tratamento de links. |
| `src/hooks` | Consultas com cache em memória, cancelamento, carregamento e proteção contra envio duplicado. |
| `src/app` | Entradas de rota, layouts e regras de navegação. |
| `src/screens` | Implementações das telas, com uma pasta por tela e estilos próprios quando aplicável. |
| `src/components` e `src/features` | Componentes de interface e recursos compartilhados entre telas. |

A chave de cache inclui usuário, organização, escola e revisão do contexto. Consultas iguais em andamento compartilham uma chamada enquanto houver observadores. Voltar a uma tela revalida seus dados. Ao sair da rota, o último observador cancela a requisição. Ao mudar de contexto, o app encerra a sessão de consultas anterior e desmonta suas telas. O Django continua responsável por autorização, validação e resultados de negócio.

[Cliente HTTP](MOBILE_API_CLIENT.md) · [Sessão e perfil](MOBILE_AUTHENTICATION.md) · [Escopo institucional](MOBILE_MULTITENANCY.md)

Na inicialização, a verificação de identidade e organizações ocorre em paralelo. Depois o app lê as escolas do contexto escolhido. O dashboard usa uma consulta de nova geração por foco e o relatório diário usa consultas separadas para resumo e lista de serviços. As telas de lista solicitam páginas sob demanda. O dashboard inicia com polling desativado.
