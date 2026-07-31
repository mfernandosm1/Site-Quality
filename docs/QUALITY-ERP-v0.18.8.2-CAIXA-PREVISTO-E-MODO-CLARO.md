# Quality ERP v0.18.8.2 — Caixa previsto e modo claro

## Objetivo
Adicionar a seleção do caixa de referência no cadastro da conta a pagar e corrigir regressões visuais do modo claro.

## Alterações
- Nova conta: campo **Caixa previsto**, preenchido automaticamente com o primeiro caixa aberto; na ausência de caixa aberto, utiliza o caixa padrão configurado.
- O caixa pode ser trocado no cadastro e novamente no momento do pagamento.
- O caixa escolhido é persistido no título e reutilizado como padrão no modal de pagamento.
- Caixas são identificados como **Aberto** ou **Fechado** nas listas.
- O pagamento continua exigindo caixa aberto por meio da validação já existente no Commerce Service.
- Correções de contraste, fundos, campos, filtros, cards, modal e exportação no modo claro.

## Arquivos alterados
- `routes/erp.js`
- `services/payables-service.js`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Compatibilidade
- Contas antigas sem `cashboxId` continuam funcionando e usam o caixa padrão ao pagar.
- Plano de Pagamento da v0.18.8 preservado.
- Abas, filtros, estornos e integração com Caixa preservados.

## Testes técnicos
- Validação de sintaxe JavaScript com Node.js.
- Revisão estrutural da view EJS e dos campos enviados pela rota.
- Conferência do ZIP contendo somente arquivos alterados e documentação.
