# Programação de merenda

`MealSchedule` registra uma programação recorrente da escola. Configure `name`, `meal_type`, `start_time`, `end_time` opcional, `entry_window_start` opcional, `weekdays` e `excluded_dates`. Os dias seguem ISO, de segunda-feira (`1`) a domingo (`7`). Exceções são datas ISO `YYYY-MM-DD`. Horas são civis no fuso do Django. Quando informado, o fim deve cair depois do início no mesmo dia.

```json
{
  "school": "53915e45-ac4c-4aad-9a66-8cb151775205",
  "meal_type": "LUNCH",
  "name": "Almoço do primeiro turno",
  "start_time": "11:00",
  "end_time": "12:15",
  "entry_window_start": "07:00",
  "weekdays": [1, 2, 3, 4, 5],
  "excluded_dates": ["2026-11-20"]
}
```

Use `POST /api/v1/meal-schedules/{id}/generate/` com `{"date":"2026-11-18"}` para criar um serviço daquela data. A primeira geração devolve `201`. Repetições devolvem `200` com o serviço existente, mesmo após alteração da programação. Alterações afetam somente gerações futuras. Para exceção, exclua a data da programação e crie o serviço manualmente com o horário especial. Um serviço já gerado pode ser editado enquanto planejado e mantém sua escola e data.

Programações ativas do mesmo tipo, na mesma escola e com dias da semana em comum, devem ter intervalos disjuntos. Na hora de cada serviço, também há validação por escola, data e tipo. Intervalos usam início inclusivo e fim exclusivo. Um horário sem fim ocupa apenas o ponto inicial. Sessões adjacentes são permitidas. O identificador de uma sessão cancelada conserva seu horário inicial para auditoria. Para uma reposição, use outro horário de início ou uma exceção manual em outra data.
