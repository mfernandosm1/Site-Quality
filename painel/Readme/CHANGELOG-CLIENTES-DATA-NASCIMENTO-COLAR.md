# Clientes — data de nascimento com copiar e colar

- Central de Clientes: Data de nascimento passou a aceitar digitação e colagem em `DD/MM/AAAA`.
- PDV > Novo cliente: mesmo comportamento aplicado ao cadastro rápido.
- A máscara é aplicada durante digitação/colagem.
- Antes de salvar, a data é validada e convertida para `AAAA-MM-DD`, preservando o formato interno já usado pelo ERP.
- Datas impossíveis, futuras ou anteriores a 1890 são recusadas.
- Ao editar cliente existente, a data armazenada em ISO é exibida como `DD/MM/AAAA`.
- O cálculo de idade da Central de Clientes foi adaptado ao novo formato visual.
