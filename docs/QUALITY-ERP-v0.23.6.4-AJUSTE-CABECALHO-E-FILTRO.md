# Quality ERP v0.23.6.4 — Ajuste de cabeçalho e filtro de cadastro

## Alterações

- Refinado o espaçamento entre CPF/CNPJ, telefone e e-mail no cabeçalho da ficha do título.
- Mantida a adaptação para Black OLED, modo Claro e telas menores.
- O filtro **Cadastro** da Central do Cliente passa a iniciar em **Todos**.
- O botão **Limpar** também restaura o filtro de cadastro para **Todos**.
- Preservadas as opções Mais recentes, Mais antigos e Últimos 7 dias.

## Arquivos alterados

- `public/css/painel-theme.css`
- `public/js/clientes.js`
- `views/clientes.ejs`

## Validação

- Sintaxe JavaScript validada com `node --check`.
- Alteração incremental, sem mudança em serviços, rotas ou estrutura de dados.
