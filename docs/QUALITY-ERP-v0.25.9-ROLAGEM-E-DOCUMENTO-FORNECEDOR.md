# Quality ERP v0.25.9 — Rolagem e Documento do Fornecedor

## Objetivo

Corrigir a rolagem da Central Financeira do Contas a Pagar e criar uma configuração segura para permitir ou bloquear a alteração de CPF/CNPJ em fornecedores já cadastrados.

## Alterações

### Contas a Pagar

- A janela de detalhes da despesa passa a ocupar a altura útil da tela.
- O cabeçalho permanece visível.
- O conteúdo interno possui uma única barra vertical funcional.
- A página ao fundo não recebe uma segunda rolagem.
- Mantida a proteção contra rolagem horizontal indevida.

### Configurações de Fornecedores

Adicionada a opção:

`Permitir alteração de CPF/CNPJ após o cadastro`

Comportamento:

- Desativada por padrão.
- Quando desativada, CPF/CNPJ e Tipo de pessoa ficam bloqueados ao editar um fornecedor existente.
- Quando ativada, o documento pode ser alterado normalmente.
- A validação de CPF/CNPJ e a prevenção de duplicidade continuam ativas.
- A proteção também é validada no serviço do servidor, evitando alteração por requisição manual.
- Compras, contas e demais vínculos continuam associados ao mesmo `supplierId`.

## Arquivos alterados

- `public/css/painel.css`
- `views/configuracoes_fornecedores.ejs`
- `public/js/fornecedores.js`
- `services/supplier-service.js`

## Testes recomendados

1. Abrir uma conta com muitas parcelas e confirmar que existe somente uma barra vertical dentro da janela.
2. Rolar até Classificação, Competências e Histórico geral.
3. Em Configurações → Fornecedores, deixar a alteração de documento desativada e salvar.
4. Abrir um fornecedor existente e confirmar que CPF/CNPJ e Tipo de pessoa estão bloqueados.
5. Ativar a opção, salvar e reabrir o fornecedor.
6. Alterar o documento para outro CPF/CNPJ válido e confirmar o salvamento.
7. Tentar utilizar um documento já cadastrado e confirmar o bloqueio por duplicidade.
