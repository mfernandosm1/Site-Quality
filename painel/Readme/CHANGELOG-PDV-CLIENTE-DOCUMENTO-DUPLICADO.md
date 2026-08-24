# PDV — Cliente com CPF/CNPJ já cadastrado

## Ajuste

O cadastro rápido de cliente no PDV agora trata CPF/CNPJ já existente como seleção de cliente, e não como possibilidade de criar uma duplicidade.

### Comportamento

- CPF/CNPJ válido e novo: cadastro segue normalmente.
- CPF/CNPJ inválido: cadastro continua bloqueado com mensagem de validação.
- CPF/CNPJ já cadastrado: o sistema identifica o cliente existente imediatamente.
- É exibida a ação **Usar este cliente no PDV**.
- O botão **Salvar e usar no PDV** fica bloqueado e passa a indicar **Cliente já cadastrado** enquanto o documento duplicado estiver informado.
- Ao escolher o cliente existente, o cadastro fecha e o cliente é selecionado na operação atual.
- Ao alterar o CPF/CNPJ para outro documento válido e não cadastrado, o formulário volta automaticamente ao estado normal de cadastro.
- A mesma proteção também permanece no retorno do backend caso a duplicidade seja detectada no momento do salvamento.
