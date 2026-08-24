# Compras XML — vínculo seguro do fornecedor

## Ajustes

- O importador de NF-e procura o fornecedor exclusivamente pelo CPF/CNPJ do emitente.
- Quando o documento já existe no cadastro mestre, o fornecedor é vinculado automaticamente e não pode ser trocado manualmente durante a importação.
- Quando o documento não existe, a conferência informa que o fornecedor precisa ser cadastrado e oferece o cadastro usando os dados presentes no XML.
- O cadastro a partir do XML reaproveita razão social, nome fantasia, CPF/CNPJ, inscrição estadual, telefone e endereço disponíveis na NF-e.
- Depois do cadastro, o fornecedor recém-criado é adicionado também ao seletor da Nova compra sem exigir F5.
- Ao usar os dados do XML na nova compra, o fornecedor fica selecionado e bloqueado para impedir vínculo acidental com outra empresa.
- Compras criadas manualmente continuam com o seletor de fornecedor funcionando normalmente.

## Motivo da correção

O cadastro feito durante a conferência atualizava o estado da tela de XML, mas a opção recém-criada não era garantida no seletor da tela Nova compra. Assim, o `supplierId` podia chegar à próxima etapa sem uma option correspondente, fazendo o campo aparentar vazio. Além disso, a conferência permitia selecionar livremente outro fornecedor, criando risco de vincular a NF-e ao cadastro errado.
