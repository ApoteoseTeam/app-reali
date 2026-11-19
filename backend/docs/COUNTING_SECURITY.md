# Segurança das contagens

| Operação | Autorização |
|---|---|
| Envio unitário e lote | Agente ativo e credencial válida para as câmeras atribuídas |
| Envio unitário legado | Chave antiga ativa e câmera ainda sem agente, enquanto o modo legado estiver habilitado |
| Consultas e resumos | Direção, gestão, nutrição ou secretaria no escopo concedido |
| Ajustes e reversões | Direção ou gestão no escopo concedido |
| Atividade técnica | Papéis de histórico técnico da câmera no escopo concedido |

O token de dispositivo é o da Fase 3. A API revalida a credencial dentro da transação em que registra as contagens. Escolas e organizações desativadas interrompem novos envios. Um evento de prato aponta para um serviço da mesma escola. Filtros aplicados após o escopo nunca ampliam acesso. Câmeras e serviços fora do escopo recebem o mesmo erro de não localização de IDs inexistentes.

Homologação e produção usam HTTPS, `DJANGO_DEBUG=false` e proxy confiável. Configure os limites de corpo no proxy e o cache compartilhado para throttling entre processos. O cache local atende o desenvolvimento. Logs de ingestão incluem códigos agregados e identificação operacional, sem tokens nem corpos. Proteja os logs e aplique retenção também no coletor.
