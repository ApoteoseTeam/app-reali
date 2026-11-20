# Dashboard, relatórios e histórico

- Início consulta `analytics/dashboard/` para a escola selecionada. Exibe entradas, previstos, servidos, desvio, serviços, hora da atualização e qualidade conforme as capacidades da sessão. Suporta atualização manual e revalidação ao voltar.
- Relatório diário usa `analytics/dashboard/` e `analytics/meal-services/` com escola, data e filtro de refeição quando autorizado.
- Histórico usa `analytics/history/{daily|weekly|monthly}/` e paginação. A comparação entre períodos vem de `analytics/organizations/summary/`. A visualização institucional também consulta `analytics/schools/comparison/`.
- Exportação autorizada usa `analytics/reports/export/` com PDF ou CSV. O app baixa pelo cliente autenticado, usa o compartilhamento do sistema e remove o arquivo temporário quando possível.

Valores nulos são exibidos como indisponíveis. Zero é apresentado quando observado. O gráfico representa os valores da página, tem escala explícita e indica registros ausentes sem desenhar barras para eles. O desvio é apresentado entre pratos previstos e servidos.

Para habilitar polling no dashboard em foco, defina `EXPO_PUBLIC_DASHBOARD_INTERVAL_MS` com intervalo mínimo efetivo de um minuto. O padrão é zero. Relatórios identificam atualização pendente e qualidade pelos campos do Django.
