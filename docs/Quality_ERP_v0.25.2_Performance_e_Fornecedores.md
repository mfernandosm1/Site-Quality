# Quality ERP v0.25.2

- Central de Clientes: 20 registros por página.
- Configurações > Cadastro de Fornecedores: campos ativos/obrigatórios e consulta de CNPJ.
- CPF/CNPJ pode ser opcional; se informado, continua validado.
- Cadastros existentes permanecem compatíveis.

## Testes rápidos
1. Abrir Clientes e confirmar 20 registros por página.
2. Em Configurações > Cadastro de Fornecedores, desmarcar CPF/CNPJ obrigatório e salvar.
3. Criar fornecedor sem documento.
4. Informar documento inválido e confirmar que continua bloqueado.
5. Reativar obrigatoriedade e confirmar bloqueio sem documento.
