# Auditoria de segurança do Reali

Auditoria em 20 de novembro de 2026 sobre o Django REST Framework, PostgreSQL, React Native/Expo, RealInova e integrações HTTP. A execução usou Windows, um PostgreSQL 18 local, usuários/escolas fictícios, correio Django de teste e provedores simulados em loopback. A revisão de visão computacional abrangeu o contrato Django para credenciais, configuração, heartbeat e ingestão.

O inventário percorreu settings, middleware, serializers, views, serviços, modelos, migrações, componentes mobile e dependências. A validação cruzou as suítes anteriores, contratos defensivos adicionados, transações PostgreSQL e fluxo HTTP com dados conhecidos. A lista de achados e os pontos de prontidão ficam no [relatório](QUALITY_FINAL_REPORT.md) e nos [achados](SECURITY_FINDINGS.md).

## Configuração e segredos

- Django exige chave forte, hosts explícitos e PostgreSQL com `DJANGO_DEBUG=false`. HTTPS, cookies seguros, CSRF e redirecionamento foram revisados. HSTS aceita configuração gradual por ambiente. CORS web depende de mesma origem ou allowlist conferida no proxy. [Checklist oficial do Django](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- Revise o proxy antes de confiar em `X-Forwarded-Proto` ou IP encaminhado. Os limitadores do DRF dependem do cache do processo na configuração atual. A efetividade entre workers e para escolas sob NAT depende da topologia e dos limites compartilhados.
- Gitleaks verifica histórico Git e snapshots locais com valores redigidos. Os resultados de dependências verificam o registro consultado na data da execução. As credenciais operacionais permanecem nos componentes de implantação.

## Privacidade escolar

O backend recebe identificadores institucionais e de câmera, contagens agregadas, horários e telemetria operacional. Contas usam nome, e-mail, papel e vínculo. A central guarda mensagens operacionais. O histórico do RealInova contém perguntas e contexto autorizado, com retenção definida no módulo. O provedor recebe pergunta, contexto limitado e evidência pertinente. O push transporta aviso genérico e referência, e o relatório pertence à escola ou organização autorizada.

Antes de piloto com dados reais, confirme finalidade, minimização de entradas do chat, bases legais, retenção e apagamento, tratamento de exportações e backups, operadores contratados, transferência de dados e direitos dos titulares. A análise técnica sustenta essas decisões de governança. [Orientação da ANPD sobre crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes)
