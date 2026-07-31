# Analytics Quality V8.4 — Dashboard profissional

## Objetivo

Evoluir o Analytics próprio da Plataforma Quality sem reescrever a arquitetura atual.

## Arquitetura

```txt
Site publicado no GitHub Pages
↓
quality-analytics.js
↓
Google Apps Script
↓
Google Sheets
↓
Painel local Node
↓
/analytics
```

## Alterações desta versão

- Painel com aparência mais profissional.
- Filtros por período:
  - Hoje
  - Últimos 7 dias
  - Últimos 30 dias
  - Todo período
- KPIs principais:
  - Produtos vistos
  - Cliques WhatsApp
  - Conversão WhatsApp
  - Favoritos
  - Buscas
  - Categorias
- Gráfico de evolução diária.
- Produtos com clique no WhatsApp.
- Conversão por produto.
- Mais vistos.
- Buscas dos clientes.
- Categorias acessadas.
- Origem do acesso.
- Dispositivos.
- Últimos eventos.
- Correção do botão Zerar Analytics para limpar Google Sheets e JSON local.

## Arquivos alterados

```txt
painel/routes/analytics.js
painel/views/analytics.ejs
Google Apps Script: Código.gs
```

## Observações importantes

O botão de zerar depende do Apps Script atualizado com suporte a:

```txt
action: reset
```

Se o Apps Script não estiver atualizado, o painel ainda zera o JSON local, mas pode não conseguir limpar a planilha.

## Risco

Baixo/médio.

A coleta do site não foi alterada nesta etapa. A alteração fica concentrada no painel e na API do Google Sheets.

## Recomendação

Testar primeiro em localhost:

```txt
http://localhost:3000/analytics
```

Depois testar:

```txt
/analytics?period=today
/analytics?period=7d
/analytics?period=30d
/analytics?period=all
```
