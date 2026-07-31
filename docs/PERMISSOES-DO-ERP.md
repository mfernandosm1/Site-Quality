# Permissões do Quality ERP

A permissão segue o formato `modulo.acao`, por exemplo `inventory.view`, `inventory.edit` e `pdv.cancel`.

Coringas aceitos pela fundação:
- `*`: acesso total.
- `pdv.*`: todas as ações de um módulo.
- `*.view`: consulta em todos os módulos.

A estrutura somente será aplicada às rotas após a implantação de login, sessão, usuário ativo e middleware de autorização.
