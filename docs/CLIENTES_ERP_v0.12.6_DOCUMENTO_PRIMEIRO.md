# Clientes ERP v0.12.6 — Documento primeiro

## Alteração de fluxo

A ordem inicial do cadastro agora é:

1. Tipo de pessoa
2. CPF ou CNPJ
3. Nome / Razão social
4. Nome fantasia

O rótulo muda automaticamente entre **CPF** e **CNPJ**.

## Agilidade operacional

- Ao abrir um novo cadastro, o cursor cai diretamente no CPF/CNPJ.
- Ao trocar entre Pessoa Física e Pessoa Jurídica, o cursor volta ao documento.
- Para CPF novo e válido, o foco continua avançando para o nome.
- Para CNPJ novo e válido, a consulta automática continua preenchendo os dados.
- Documento duplicado ativo ou inativo continua bloqueado e oferece abrir/reativar.
- Ao editar um cliente existente, o foco permanece no nome para evitar alteração acidental do documento.

## Instalação

Substitua somente:

- `C:\Site\painel\views\clientes.ejs`
- `C:\Site\painel\public\js\clientes.js`

Depois reinicie o painel e atualize com `Ctrl + F5`.
