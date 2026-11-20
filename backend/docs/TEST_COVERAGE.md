# Cobertura técnica

A cobertura Python observa `apps` e `config` e exclui migrações, arquivos de teste e pontos de entrada ASGI/WSGI. A suíte de PostgreSQL cobre autorização, convites, idempotência, previsão, indicadores, RealInova, ajustes, notificações e bloqueios. Execute na pasta do backend.

```bash
python -m pytest --cov --cov-report=term-missing --cov-report=xml
```

A execução em PostgreSQL local com a simulação Expo ativa aprovou 115 testes em 296,68 s. As duas cargas opcionais passaram em sessões separadas. O Python cobriu 5.786 de 6.219 instruções, aproximadamente 93%. As lacunas incluem tratamento excepcional de provedores e ramos de manutenção das filas.

| App | Instruções cobertas |
| --- | ---: |
| API | 92,51% |
| Usuários | 94,59% |
| Instituições | 93,10% |
| Câmeras | 95,27% |
| Contagens | 95,11% |
| Merenda e previsão | 96,55% |
| Indicadores | 94,98% |
| RealInova | 90,66% |
| Notificações | 89,00% |

A cobertura Node executou 17 testes. Nos módulos TypeScript compilados do cliente HTTP, links, preferências de notificações e sessão, foram 92,31% de linhas, 83,93% de ramos e 54,39% de funções.

```bash
npx --no-install tsc -p tsconfig.tests.json
node --experimental-test-coverage --test-coverage-include='.test-build/**/*.js' --test tests/*.test.cjs
```

O piso de cobertura Python no CI começa em 80%, com prioridade de revisão sobre módulos críticos e mudanças com regressão. O CI também exige 80% das linhas no conjunto de módulos frontend medidos, com meta de ampliar os contratos exercitados em `RealiApi`. Cobertura do componente visual, ponte nativa e comportamento do aparelho depende de testes próprios.
