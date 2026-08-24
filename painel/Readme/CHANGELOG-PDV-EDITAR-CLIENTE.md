# PDV — edição rápida de cliente

## Ajuste

- Adicionado ícone de lápis ao lado do cliente selecionado no PDV.
- O ícone fica oculto quando a operação está em **Consumidor final**.
- Tooltip nativo do ícone: **Editar cliente**.
- Ao clicar, o PDV abre o mesmo formulário integrado de cliente já usado no cadastro rápido, preenchido com os dados atuais.
- O formulário entra em modo **Editar cliente** e permite alterar dados principais, endereço e relacionamento.
- Ao salvar, é usado o cadastro mestre de clientes (`PUT /erp/clientes/:id`), sem criar registro paralelo.
- O cliente atualizado permanece selecionado na operação e os demais dados da venda/O.S. não são descartados.
- O próprio CPF/CNPJ do cliente em edição não é tratado como duplicidade; a validação continua impedindo documento pertencente a outro cliente.
- Cancelar ou fechar o formulário não altera o cadastro nem a operação.

## Arquivos alterados

- `views/pdv.ejs`
- `Readme/CHANGELOG-PDV-EDITAR-CLIENTE.md`
