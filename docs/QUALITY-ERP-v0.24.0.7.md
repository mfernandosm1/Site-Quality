# Quality ERP v0.24.0.7 — Polimento Final e Estabilização

## Ajustes aplicados

### Centro de Operações
- O menu **Gerenciar** fecha ao clicar fora.
- O menu fecha com **Esc**.
- Apenas um menu pode permanecer aberto por vez.
- O menu fecha ao alterar ou enviar filtros.
- O menu fecha ao navegar para outra operação ou situação.

### Financeiro
- Mantida a tela sem cabeçalho azul e sem mensagens de infraestrutura.
- Os cards superiores passam a utilizar `finance/movements.json`, origem consolidada do Financeiro, contemplando recebimentos, pagamentos e reflexos integrados.
- Os objetos enviados à view possuem valores-padrão para evitar `ReferenceError` e acessos a propriedades inexistentes.

### Contas a Receber
- Removido o cabeçalho completo da tela.
- Mantido apenas o botão **← Financeiro**.
- Ajuste visual compatível com modo Claro e Black OLED.

### Estabilidade
- Normalização do objeto `dashboard` antes do `res.render`.
- Renomeada a variável local de configurações gerais do comércio para `commerceSettings`, evitando confusão com configurações específicas de caixa.
- Preservada a proteção contra o uso da chave reservada `settings` no Express/EJS.

## Arquivos alterados
- `routes/erp.js`
- `views/centro_operacoes.ejs`
- `views/contas_receber.ejs`
- `public/css/painel-theme.css`
- `docs/QUALITY-ERP-v0.24.0.7.md`
- `docs/CHECKLIST-v0.24.0.7.md`
