# Reali — modelos Django

Estrutura base dos **11 modelos do DER**: `User`, `Membership`, `Organization`, `School`, `Camera`, `StudentCount`, `PlateCount`, `MealService`, `AttendanceSnapshot`, `MealForecast`, `DailyMetrics`. `BaseModel` e `BaseCountModel` são abstratos e não criam tabelas.

## Instalação

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations users institutions cameras meals counting analytics
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Defina `AUTH_USER_MODEL = 'users.User'` **antes das primeiras migrações**. Para PostgreSQL configure as variáveis `.env.example` no ambiente; o Django **não lê .env automaticamente**. Por padrão, sem `POSTGRES_DB`, utiliza SQLite para desenvolvimento.

## Limitações deliberadas

- Sem cadastro de alimentos, ingredientes, estoque, sobras ou saída de alunos.
- `StudentCount` representa **entradas**, não presença exata ou pessoas únicas. `PlateCount` representa pratos, não pessoas únicas.
- `AttendanceSnapshot` guarda a base da previsão num instante; **não recalcule retroativamente** uma previsão após começar o preparo.
- A integridade entre entidades é checada no `clean()`/`save()`; `QuerySet.update()`, `bulk_create()` e SQL direto podem ignorar validações Python. Para produção, aplique validação nos serializers/services e acrescente testes e políticas de permissões por organização.
- Idempotência: câmeras devem enviar `external_event_id` estável por evento. A constraint unique impede duplicidade em concorrência; a API ainda precisa retornar sucesso idempotente sem gravar cópia.
- `DailyMetrics` deve ser gerado por serviço de agregação idempotente. Não somar as mesmas entradas para cada refeição; consolidar contagens únicas do dia.
- As URLs incluem somente `/admin/`; API, JWT, controle por escola, dispositivo autenticado, testes de integração, auditoria e tarefas de consolidação são etapas posteriores.
- **Não publicar este arquivo de settings em produção sem hardening**: HTTPS, cookies, CORS/CSRF, autenticação, chave segura, logs e observabilidade.
