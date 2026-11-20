# Auditoria de autenticação e convites

O login usa e-mail normalizado e o hasher de senha do Django. O formato de login, refresh e logout foi preservado. A saída confirmada encerra a sessão inteira com identificador e mantém sessões independentes. Um refresh assinado e válido para a sessão pode encerrá-la mesmo após rotação. A validação exige assinatura, validade, versão da conta na renovação e o tipo refresh.

Access tokens legados emitidos antes do identificador de sessão expiram no prazo original. A primeira rotação de refresh legado associa um identificador estável. A tabela de revogação já existente tem retenção compatível com a janela de refresh e é limpa pelo worker de notificações. O comando de manutenção do Simple JWT `flushexpiredtokens` aplica a retenção dos registros de token do framework.

`test_phase2.py` cobre login, credenciais inválidas, conta desativada, expiração, tipo incorreto, rotação, revogação, limitação de tentativas, troca de senha e recuperação. O teste HTTP da Fase 10 usa convite por e-mail em memória, confirmação de token, senha escolhida pelo convidado, login e carregamento de escola. A suíte existente cobre convite usado, revogado, vencido, reenvio, vínculo na segunda instituição e identidade incompatível.

A configuração nativa de App Links/Universal Links exige teste com o domínio e as assinaturas de homologação. O limite por IP atual é local ao cache. Valide a política compartilhada do proxy e cache com o volume de usuários atrás do mesmo NAT.
