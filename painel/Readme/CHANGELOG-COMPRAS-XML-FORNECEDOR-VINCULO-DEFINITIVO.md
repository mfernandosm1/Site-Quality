# Compras XML — vínculo definitivo do fornecedor

## Problema corrigido

Na conferência da NF-e o backend identificava corretamente o fornecedor pelo CPF/CNPJ do emitente, porém a tela de **Nova compra** trabalhava com a lista de fornecedores carregada quando a página de Compras foi aberta.

Quando o fornecedor era cadastrado durante a conferência do XML (ou havia sido criado depois que a página foi carregada), o backend já o encontrava, mas o `select` da segunda etapa ainda podia estar desatualizado. O resultado era exatamente o comportamento observado: a primeira etapa mostrava o fornecedor como vinculado e a segunda etapa aparecia sem fornecedor selecionado.

## Correção

- A conferência do XML agora devolve também um snapshot do fornecedor efetivamente encontrado pelo CPF/CNPJ.
- O frontend sincroniza esse fornecedor com a lista local antes de abrir a Nova compra.
- O fluxo não depende mais da lista de fornecedores que existia no carregamento inicial da página.
- Quando o fornecedor é criado durante a conferência, ele é adicionado imediatamente ao estado local e permanece vinculado ao XML.
- A segunda etapa de uma compra originada por XML não exibe mais o seletor livre de fornecedor.
- Em seu lugar é exibido apenas o **Fornecedor da NF-e**, identificado automaticamente pelo CPF/CNPJ do emitente.
- A compra mantém internamente o `supplierId` correto para salvar/finalizar.
- Foi adicionada uma validação adicional no serviço de Compras: quando a operação veio de XML, o CPF/CNPJ do fornecedor salvo precisa ser o mesmo CPF/CNPJ do emitente informado pela NF-e.
- O documento fiscal do XML passa a seguir junto no payload da compra, preservando os dados do emitente/protocolo já preparados pela importação.

## Fluxo final

### Fornecedor já cadastrado
1. Ler CPF/CNPJ do `<emit>` da NF-e.
2. Procurar o fornecedor no cadastro mestre.
3. Encontrando, vincular automaticamente.
4. Na conferência, mostrar o fornecedor identificado.
5. Em **Usar dados na nova compra**, mostrar o fornecedor como informação fixa, sem nova seleção.

### Fornecedor ainda não cadastrado
1. Ler os dados do `<emit>` da NF-e.
2. Informar que o fornecedor não foi localizado.
3. Permitir cadastrar usando os dados da própria NF-e.
4. Após cadastrar, vincular automaticamente o novo cadastro à conferência.
5. Na Nova compra, mostrar esse fornecedor como informação fixa, sem permitir trocar por outro.

### Compra manual
Nenhum comportamento foi alterado. O campo **Fornecedor** continua com o seletor normal e com o cadastro rápido que já funcionava anteriormente.

## Arquivos alterados

- `views/compras.ejs`
- `services/purchase-service.js`
