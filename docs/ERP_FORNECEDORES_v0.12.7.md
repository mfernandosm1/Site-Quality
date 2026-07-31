# ERP Quality — Fornecedores v0.12.7

## Objetivo

Melhorar o início do cadastro e impedir definitivamente duplicidade de CPF/CNPJ, oferecendo acesso direto ao fornecedor já existente e reativação quando o registro estiver inativo.

## Arquivos alterados

- `services/supplier-service.js`
- `views/fornecedores.ejs`
- `public/js/fornecedores.js`

Não é necessário alterar o `erp.js`.

## Melhorias

### CPF/CNPJ no início

A ordem dos dados principais passa a ser:

1. Tipo de pessoa;
2. Origem;
3. CPF/CNPJ;
4. nome completo ou razão social;
5. demais informações.

Isso permite validar e localizar o fornecedor antes de preencher o restante.

### Verificação imediata

Ao informar um CPF/CNPJ válido, o sistema procura o documento entre todos os fornecedores, inclusive inativos.

### Fornecedor ativo já existente

O cadastro novo é bloqueado e aparece um cartão com:

- código;
- nome;
- cidade;
- situação;
- botão `Abrir cadastro existente`.

### Fornecedor inativo

Quando o documento pertence a um fornecedor inativo, aparecem:

- botão `Abrir cadastro existente`;
- botão `Reativar fornecedor`.

A reativação utiliza o mesmo registro e preserva todo o histórico. Nenhum novo fornecedor é criado.

### Regra de duplicidade

O bloqueio rígido passa a usar apenas CPF/CNPJ.

E-mail repetido deixa de impedir o cadastro, porque o mesmo representante ou setor financeiro pode atender mais de uma empresa.

### Pessoa Física

O botão `Consultar CNPJ` fica completamente oculto quando o tipo escolhido é Pessoa Física.

## Instalação

Faça backup e substitua:

1. `services/supplier-service.js`
   - destino: `C:\Site\painel\services\supplier-service.js`

2. `views/fornecedores.ejs`
   - destino: `C:\Site\painel\views\fornecedores.ejs`

3. `public/js/fornecedores.js`
   - destino: `C:\Site\painel\public\js\fornecedores.js`

Depois reinicie o painel.

## Testes

1. Informar CPF de fornecedor ativo:
   - deve bloquear novo cadastro;
   - deve mostrar `Abrir cadastro existente`.

2. Inativar o fornecedor e tentar o mesmo CPF:
   - deve mostrar `Reativar fornecedor`;
   - ao reativar, deve abrir o cadastro existente.

3. Informar CNPJ existente:
   - deve bloquear antes da consulta externa.

4. Informar documento novo:
   - deve permitir continuar normalmente.

5. Selecionar Pessoa Física:
   - o botão de consulta de CNPJ não pode aparecer.

6. Editar um fornecedor:
   - o próprio documento não deve ser tratado como duplicado.
