# Changelog Consolidado

Este arquivo reúne apenas marcos confirmados pelos documentos existentes e pelo estado atual do projeto. Documentos técnicos antigos permanecem em `historico/documentacao-anterior/`.

## ERP v0.11.6 — Operação de estoque

**Status: em validação**

- preparação de botões rápidos de quantidade;
- motivos rápidos/favoritos em pequenos botões;
- campo de motivo manual mantido e editável;
- motivos recentes para reduzir digitação;
- histórico operacional com mais contexto.

## ERP v0.11.5 — Tela operacional de estoque

- área `/erp/estoque`;
- indicadores e filtros;
- listagem de itens controlados;
- painel lateral do produto;
- entrada, saída e ajuste manual;
- motivo obrigatório;
- consulta de histórico;
- compatibilidade com tema Black OLED.

## ERP v0.11.1 — Correção da gravação

- caminho do diretório de estoque resolvido a partir da raiz real do painel;
- instância única de `InventoryService` em `app.locals`;
- integração ativada somente quando o controle de estoque do produto está marcado;
- preservação dos JSONs existentes.

## ERP v0.11.0 — Fundação do estoque

- criação do `InventoryService`;
- `stock.json`, `movements.json`, `locations.json` e `inventory-settings.json`;
- identidade estável para produtos e combinações;
- saldo físico, reservado e disponível preparados;
- movimentações de entrada, saída, reserva, liberação, ajuste e estorno;
- integração gradual com o Cadastro Mestre;
- `products.json` mantido como espelho temporário para compatibilidade.

## ERP v0.10.0 — Fundação ERP

- nova área ERP e dashboard estrutural;
- documentação de arquitetura, entidades, eventos, banco e integrações;
- separação Plataforma → Empresa → Unidade → Módulos;
- estratégia ERP → Site;
- preparação para base unificada e multiempresa;
- reorganização da Home como Centro de Operações.

## WhatsApp v1.x — Provider e catálogo seguro

- criação de fronteira única sobre `whatsapp-web.js`;
- leitura segura de conversas sem interromper toda a sincronização por erro individual;
- migração do catálogo do Inbox para o Provider;
- preservação de fallbacks durante a transição.

## WhatsApp v0.6.x — Armazenamento e performance

- armazenamento inteligente de mídias;
- visualização temporária sem cópia automática;
- Central de Armazenamento e limpezas manuais;
- paginação do Inbox;
- polling incremental;
- hotfixes de visualização e download de mídias.

## WhatsApp v0.5.9 — Painel Comercial

- indicadores comerciais;
- funil por status;
- oportunidades abertas;
- filtros operacionais;
- navegação direta para a conversa;
- leitura sem alterar a base do Inbox.

## Site / Analytics / Produto

- site estático publicado via GitHub Pages;
- Analytics próprio com Apps Script e Google Sheets;
- dashboard por período, produtos, WhatsApp, favoritos, buscas, origem e dispositivos;
- zoom premium da galeria em desktop e mobile;
- categorias, produtos e publicação evoluídos de forma incremental.

## Versões anteriores

Os changelogs detalhados da automação WhatsApp, Site e demais entregas continuam preservados no diretório histórico.
