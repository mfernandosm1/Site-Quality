# Quality ERP v0.23.6.3 — Refinamento da ficha e filtros de clientes

## Ficha de Contas a Receber
- Removida a repetição do cliente no bloco superior.
- CPF/CNPJ, telefone e e-mail foram movidos para o cabeçalho.
- Parcelas iniciam abertas.
- Operação, recebimentos e histórico permanecem recolhidos.

## Central do Cliente
- A pesquisa por cidade já era suportada pelo índice de pesquisa; o campo agora informa isso.
- Novo filtro Cadastro: Mais recentes, Mais antigos, Últimos 7 dias e Todos.
- O filtro funciona junto com situação, pessoa, classificação e pesquisa textual.
- Compatibilidade com os dados atuais preservada.

## Arquivos alterados
- public/js/contas-receber.js
- public/js/clientes.js
- views/clientes.ejs
