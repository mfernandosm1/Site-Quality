# Visão dos Módulos

## Site

Site público estático por decisão de arquitetura: velocidade, SEO, custo baixo e simplicidade. O painel gera conteúdo e publica no GitHub Pages.

## Produtos

Cadastro Mestre destinado a alimentar Site, Estoque, Orçamentos, Calculadora, Compras, PDV e Compatibilidade. Categorias e subcategorias devem ser compartilhadas, sem bases paralelas.

## Calculadora Comercial

Recursos já trabalhados:

- importação de listas Excel;
- seleção manual das colunas quando necessário;
- produtos em USD e BRL;
- cotação do dólar com ajuste manual aplicado apenas à cotação;
- percentual de importação;
- margem de lucro;
- entrada em dinheiro;
- aparelho na troca;
- cartão, boleto ou crediário;
- taxas aplicadas sobre o saldo restante;
- parser de listas copiadas do WhatsApp;
- texto pronto para envio ao cliente;
- Biblioteca Comercial de mensagens.

## Orçamentos

O objetivo é salvar o orçamento com operação simples, usando o nome do cliente e o conteúdo gerado, permitindo busca e nova simulação posterior. A integração futura deve usar o cadastro mestre de clientes quando ele existir.

## WhatsApp, Inbox e CRM

A área inclui conexão, Inbox, blocos, mídias, ficha do cliente, notas, lembretes e Painel Comercial. O Provider reduz dependência direta de chamadas frágeis do `whatsapp-web.js`.

Direção atual:

- sincronização manual quando necessário;
- alertas de cliente sem resposta no Painel Comercial;
- pendência e próxima ação por atendimento;
- encerramento explícito de atendimento;
- evitar poluição visual no Inbox;
- futuramente unificar o contato com Clientes do ERP.

## Compatibilidade de Capas e Películas

Deve permanecer em Ferramentas, sem duplicar cards no ERP. O cadastro precisa ser simples: modelo completo e modelos compatíveis. O resultado pode combinar compatibilidade com disponibilidade em estoque.

## Analytics

Fluxo atual:

```text
GitHub Pages → quality-analytics.js → Apps Script → Google Sheets → Painel local
```

Métricas incluem visualizações, categorias, produtos, favoritos, WhatsApp, origem, dispositivo, buscas e recomendações.

## Publicação

`publish.js` cria backup, sincroniza o site público com a raiz do repositório, gera arquivos necessários, faz commit e envia para `main`.

## Módulos futuros do ERP

- Clientes;
- Fornecedores;
- Compras;
- PDV;
- Financeiro;
- Fluxo de Caixa;
- Ordens de Serviço;
- DRE e DFC;
- usuários, permissões e auditoria completa.
