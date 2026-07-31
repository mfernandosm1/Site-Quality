# Integrações do Ecossistema

## Fonte da verdade

O ERP será a fonte central para clientes, produtos, fornecedores, vendas e demais entidades operacionais.

## Produto e Site

1. Produtos existentes poderão ser importados de `products.json` para o ERP.
2. Após a migração, o fluxo principal será ERP → Site.
3. O ERP produzirá um arquivo público compatível com o site estático.
4. A sincronização terá prévia, backup e estados claros.
5. Dados internos, como custo e fornecedor, nunca serão exportados ao site.

## Produto e outros módulos

- Estoque fornece disponibilidade.
- Compras atualiza custo e saldo.
- Calculadora comercial usa custo e regras de margem.
- Orçamento reutiliza produto, variação e preço.
- PDV registra venda e movimentação.
- WhatsApp pode compartilhar catálogo e orçamento.
- Compatibilidade relaciona aparelhos, capas e películas.
- Financeiro recebe efeitos da venda, não o cadastro do produto.
