# Quality ERP v0.19.0 — Fundação do módulo Compras

## Objetivo
Implantar Compras como operação própria, separada de despesas manuais, preservando fornecedor, itens, documentos, estoque, título financeiro, usuário e histórico.

## Arquivos e dados
- Serviço: `services/purchase-service.js`
- Rotas: `routes/erp.js`
- Interface: `views/compras.ejs`
- Dados gerados automaticamente: `data/erp/purchases/purchases.json`, `purchase-events.json` e `settings.json`

## Estados
- `draft`: rascunho editável.
- `open`: compra aberta editável.
- `completed`: compra concluída e imutável, com efeitos em Estoque e Contas a Pagar.
- `reversed`: compra estornada, sem exclusão do histórico.

## Integrações
### Produtos
A busca usa o cadastro mestre `Site_with_content/content/products.json` e considera nome, código, código de barras, referência, marca, modelo e SKU. O vínculo usa o ID existente e não cria duplicidade.

### Estoque
Somente a conclusão registra entradas. Cada movimento usa classificação `purchase`, origem rastreável e referência da compra. O estorno gera saída inversa; o histórico original não é apagado.

### Contas a Pagar
A conclusão chama o serviço consolidado de Contas a Pagar com `entryType: purchase`, `origin: purchase` e `originId` igual ao ID da compra. O plano de pagamento é enviado ao serviço existente, sem duplicação da regra de parcelas.

### Consistência
A conclusão possui chave de processamento para reduzir duplo clique. Se o financeiro falhar depois de alguma entrada de estoque, o serviço tenta reverter as entradas já iniciadas e mantém a compra aberta com evento de falha. Reconcluir uma compra concluída não duplica efeitos.

O estorno exige motivo e é bloqueado quando o estoque atual não comporta a saída inversa. Conta a pagar com pagamento já registrado também bloqueia o estorno pelo serviço financeiro existente.

## Estrutura fiscal preparada
O cabeçalho mantém modelo, versão do XML, protocolo, emitente, impostos e documentos relacionados. Cada item mantém código do fornecedor, EAN, NCM, CEST, CFOP, unidade e impostos. Nesta versão não há cálculo tributário, manifestação, transmissão ou conclusão automática por XML.

## XML de referência analisado
O arquivo de exemplo é uma NF-e modelo 55, versão 4.00, com emitente, destinatário, número, série, chave, datas, itens, códigos, EAN, NCM, CEST, CFOP, unidades e grupos tributários, incluindo ICMS, IPI, PIS, COFINS e IBSCBS. Essa variedade orientou a estrutura fiscal flexível, sem interpretar tributação nesta etapa.

## Fluxo de uso
1. Abra ERP > Compras.
2. Cadastre uma compra como Rascunho ou Aberta.
3. Selecione fornecedor e produtos existentes.
4. Informe quantidades, custos, totais e plano de pagamento.
5. Revise os detalhes.
6. Clique em Concluir compra para gerar estoque e Contas a Pagar.
7. Use Estornar somente quando necessário; informe o motivo.

## Próximas versões
- v0.19.1: refinamentos de busca, detalhes, filtros e estorno avançado.
- v0.19.2: leitura de XML, tela de conferência, vínculo/cadastro controlado de produtos e fornecedor, sem conclusão automática.
- Depois: devolução de compra, manifestação do destinatário e integrações fiscais.


## Atualização v0.19.1 — Simplificação do cadastro manual

- Removido o fluxo de rascunho da interface operacional. Registros antigos permanecem compatíveis e podem ser editados pelas listagens existentes.
- O botão **Salvar** mantém a compra em situação Aberta, sem efeitos definitivos.
- O botão **Finalizar compra** salva os dados e, após confirmação, executa a conclusão integrada ao Estoque e ao Contas a Pagar.
- Série, emissão e chave de acesso foram agrupadas em **Dados fiscais adicionais**, recolhidos por padrão.
- A seção **Totais e classificação** foi renomeada para **Valores e financeiro**.
- O primeiro plano de pagamento recebe automaticamente o total atual da compra.
- Quando o total muda e há apenas uma forma de pagamento, o valor é atualizado automaticamente.
- Em planos com várias formas, o saldo é ajustado automaticamente apenas quando a soma anterior ainda correspondia ao total anterior, preservando alterações manuais.
- Mantidas as proteções de conclusão idempotente, prevenção de duplo envio e compatibilidade com dados existentes.
