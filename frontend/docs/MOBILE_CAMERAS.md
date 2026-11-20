# Câmeras e contagens

A câmera é filtrada por escola e tipo em `GET cameras/`. O detalhe usa `status/` e exibe estado operacional, configuração administrativa ativa, última comunicação, estado do detector e motivo operacional quando presentes. `health-history/` fica disponível a perfis autorizados. A edição administrativa usa `PATCH cameras/{id}/` para identificação e localização. `activate/` e `deactivate/` pedem confirmação.

A tela Contagens consulta `student-counts/`, `plate-counts/` e seus resumos. A lista é paginada. Filtros incluem data ou intervalo local, escola, câmera e serviço quando se trata de pratos. A interface apresenta a origem e a última atualização possível. Para perfis de cozinha e docência, os resultados disponíveis vêm do dashboard, relatórios e indicadores de serviço autorizados pelo Django.

Correções usam exclusivamente `POST count-adjustments/` com ID do evento, variação não nula e motivo. A visão da câmera trabalha com telemetria e status autorizados. A configuração técnica usa `GET` e `PUT cameras/{id}/configuration/`. O formulário edita FPS, limiar, versão e os pontos normalizados da linha ou região conforme o tipo da câmera. A API devolve a versão da configuração. Campos de rastreamento existentes são preservados.
