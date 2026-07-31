# Arquitetura e Integrações

## Visão geral

```text
Site público estático ───────┐
WhatsApp / Inbox / CRM ──────┤
Orçamentos / Calculadora ────┤
Compatibilidade ─────────────┤
                             ↓
                         ERP Core
                             ↓
      Produtos | Clientes | Estoque | Compras | PDV | Financeiro
                             ↓
               Serviços | Eventos | Auditoria
                             ↓
              JSON local agora / banco futuro
```

## Hierarquia futura

```text
Plataforma → Empresa → Unidade → Módulos
```

A Quality Celulares é a primeira empresa. A preparação multiempresa não deve complicar a operação atual.

## Fonte da verdade

- **Produtos:** Cadastro Mestre do ERP.
- **Saldo:** InventoryService e arquivos próprios de estoque.
- **Site:** recebe exportação pública compatível com `products.json`.
- **Clientes:** futuramente unificados entre CRM, WhatsApp e ERP.
- **Financeiro:** recebe efeitos das operações; não deve recriar produtos ou clientes.

## Integrações planejadas

### Produtos → Site

O ERP mantém os dados internos e exporta apenas os campos públicos. A publicação deve ter prévia, backup e estados claros.

### Produtos ↔ Estoque

Produto e variação possuem identidade estável. O saldo é consultado no serviço de estoque. O campo legado de estoque no produto pode funcionar temporariamente como espelho de compatibilidade.

### Compras → Estoque

Uma compra confirmada deverá gerar entrada de estoque, atualizar custo conforme regra definida e manter vínculo com fornecedor e documento.

### PDV → Estoque e Financeiro

Uma venda confirmada deverá registrar saída de estoque e gerar seus efeitos financeiros. Cancelamentos devem usar estorno, preservando histórico.

### Orçamentos e Calculadora → Produtos

Devem reutilizar produto, variação, custo e política comercial do Cadastro Mestre. Salvar um orçamento não deve duplicar o produto.

### WhatsApp / CRM → Clientes

A conversa é um canal, não o cadastro mestre do cliente. O mesmo cliente poderá ter histórico de atendimento, orçamento, venda, O.S. e financeiro.

### Compatibilidade → Produtos e Estoque

A compatibilidade relaciona modelos de aparelhos com capas e películas e pode apresentar disponibilidade, sem criar um catálogo paralelo.

## Camadas recomendadas

- **Apresentação:** EJS, site e interfaces.
- **Aplicação:** serviços e casos de uso.
- **Domínio:** regras centrais.
- **Infraestrutura:** JSON local atualmente; SQLite ou outro banco após validação.
- **Integrações:** adaptadores, exportadores e eventos.
