# Contexto Atual do Projeto

Atualizado em 26/07/2026.

## Identidade

- Plataforma: **Painel Quality**.
- Empresa inicial: **Quality Celulares**.
- Objetivo: centralizar Site, WhatsApp, CRM, Orçamentos, Estoque e futuro ERP em uma plataforma própria.
- Estratégia: evolução incremental, local primeiro, preparada para nuvem e multiempresa no futuro.

## Estado atual

### Estáveis ou já utilizados

- site público estático no GitHub Pages;
- painel administrativo local em Node/Express/EJS;
- publicação local com backup e envio para GitHub;
- Analytics via Site → Apps Script → Google Sheets → painel;
- WhatsApp, Inbox, CRM, lembretes e Painel Comercial;
- Central de Mídias e mecanismos de recuperação;
- Calculadora Comercial e parser de listas de WhatsApp;
- Cadastro Mestre de Produtos;
- categorias e subcategorias;
- compatibilidade de capas e películas em evolução;
- fundação do ERP;
- fundação e operação manual de estoque.

### Módulo atualmente trabalhado

**ERP Estoque — linha v0.11.x**

A fundação do estoque já utiliza `InventoryService`, saldo separado e histórico imutável de movimentações. A interface operacional permite consultar o item, abrir um painel lateral e registrar entrada, saída ou ajuste com motivo obrigatório.

### Entrega preparada para validação

**v0.11.6 — melhorias de operação**

- botões rápidos de quantidade;
- motivos rápidos/favoritos;
- campo de motivo manual preservado e editável;
- motivos recentes;
- histórico com mais contexto operacional.

A versão deve permanecer como **em validação** até ser instalada e testada no ambiente real.

## Próximo passo recomendado

1. validar a v0.11.6 sem alterar os JSONs de dados;
2. corrigir apenas eventuais falhas encontradas;
3. definir quantidade ideal por item e alertas de reposição;
4. desenhar a integração Estoque → Compras antes de iniciar o módulo de Compras.

## Princípio central do ERP

Nenhum módulo deve ser desenvolvido isoladamente. Produtos, Estoque, Compras, PDV, Orçamentos, Clientes e Financeiro precisam reutilizar a mesma base e os mesmos identificadores, evitando cadastros duplicados.
