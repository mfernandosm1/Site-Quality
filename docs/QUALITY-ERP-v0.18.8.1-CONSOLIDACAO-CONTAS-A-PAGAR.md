# Quality ERP v0.18.8.1 — Consolidação do Contas a Pagar

## Objetivo
Consolidar os recursos operacionais da v0.18.7.2 com o Plano de Pagamento da v0.18.8, sem reescrever o módulo.

## Arquivos alterados
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `services/payables-service.js`
- `routes/erp.js`

## Ajustes realizados
- Restauradas as abas **Contas Ativas** e **Estornadas**.
- Contas estornadas permanecem fora dos cards e totalizadores ativos.
- Restaurado o conjunto de situações: Todas, Em aberto, Parcial, Paga, Vencida e Estornada.
- Situação **Vencida** é calculada pelas parcelas com saldo e vencimento anterior à data atual, sem criar novo estado persistido.
- Preservados os filtros de fornecedor, forma prevista, centro de custo, plano de contas, período e pesquisa.
- Exportação utiliza exatamente a visualização e os filtros ativos; totais financeiros desconsideram registros estornados.
- Preservada integralmente a arquitetura do Plano de Pagamento da v0.18.8: múltiplas formas, entrada + saldo, validação da composição, parcelas automáticas e compatibilidade legada.
- Adicionadas orientações curtas sobre Competências e Plano de Pagamento.
- Refinados espaçamentos, Black OLED e comportamento responsivo.
- Versão exibida atualizada para `0.18.8.1`.

## Compatibilidade
- Dados antigos continuam sendo tratados pelo fallback existente de forma prevista única.
- Estados legados `cancelled` e `reversed` continuam reconhecidos como estornados.
- Nenhuma estrutura JSON foi migrada ou removida.

## Validações executadas
- Verificação de sintaxe JavaScript com `node --check`.
- Carregamento dos módulos de serviço e rotas pelo parser do Node.js.
- Conferência dos IDs usados no EJS e JavaScript.
- Revisão dos filtros combinados com as duas abas.
- Revisão do cálculo dos cards, que continua excluindo estornadas.
- Revisão da exportação PDF e imagem sobre a lista filtrada atual.

## Correção complementar — filtro por origem
- Restaurado o filtro **Origem** com as opções **Todas**, **Despesas** e **Compras**.
- O filtro é enviado à API e combinado com situação, fornecedor, forma prevista, centro de custo, plano de contas, período e pesquisa.
- A exportação registra o filtro de origem aplicado e exporta somente os resultados correspondentes.
- Cadastros manuais continuam classificados como `expense`.
- Integrações do módulo de Compras podem criar títulos com `entryType: "purchase"`, preservando a separação entre compra real e despesa operacional.
- Mantida compatibilidade com registros que utilizem os valores legados `compra`/`despesa` ou que indiquem a origem no campo `origin`.
