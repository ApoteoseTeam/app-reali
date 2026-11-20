# Merenda e programação

`GET meal-services/` lista serviços do dia e da escola. O app mostra PLANNED, PREPARING, SERVING, FINISHED e CANCELLED com rótulos em português. A programação semanal de `GET meal-schedules/` e seus serviços substituem a demonstração de cardápio nas telas existentes.

Gestão pode criar um serviço ou uma programação e gerar o serviço de uma data a partir da programação. O formulário valida escola, tipo, horário e dias da semana. O Django decide a disponibilidade dos horários e a permissão para criar. A operação de preparo bloqueia o botão enquanto envia `POST meal-services/{id}/start/`, recebe snapshot e previsão e atualiza o estado. Consultas seguintes leem `attendance-snapshot/` e `forecast/`.

`start-serving/`, `finish/` e `cancel/` registram transições no Django. Finalização e cancelamento pedem confirmação e o cancelamento exige motivo. Após conflito, o app relê o serviço. Quantidades, previsto e servido permanecem vinculados ao ID do serviço. Um valor ausente aparece como indisponível.
