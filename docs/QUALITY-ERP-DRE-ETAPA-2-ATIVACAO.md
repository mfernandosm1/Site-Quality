# Quality ERP — DRE Inteligente — Etapa 2

## Objetivo

Ativar o DRE Inteligente na navegação principal do ERP. A implementação funcional já existia em `/erp/financeiro/dre`, porém o cartão da área de Gestão ainda direcionava para a página genérica de módulo planejado em `/erp/modulo/dre`.

## Ajustes realizados

- O módulo `dre` passou de `planejado` para `ativo`.
- O nome exibido passou a ser **DRE Inteligente**.
- A rota `/erp/modulo/dre` agora redireciona para `/erp/financeiro/dre`.
- A versão visual do ERP e do DRE foi atualizada para `0.27.1`.
- Nenhuma alteração foi feita no importador de clientes WM10. As proteções incrementais existentes no ZIP recebido foram preservadas.

## Rotas

- Entrada pelo painel: `/erp/modulo/dre`
- Tela funcional: `/erp/financeiro/dre`
- API: `/erp/financeiro/api/dre`

## Validação esperada

1. Abrir `/erp`.
2. Confirmar que o cartão **DRE Inteligente** aparece como **Ativo**.
3. Clicar no cartão.
4. Confirmar o redirecionamento para `/erp/financeiro/dre`.
5. Validar filtros, cards e drill-down.

## Arquivos alterados

- `routes/erp.js`
- `views/erp_dashboard.ejs`

## Arquivo novo

- `docs/QUALITY-ERP-DRE-ETAPA-2-ATIVACAO.md`
