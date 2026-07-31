# Quality ERP v0.18.7.1 — Estornos e refinamento final do Contas a Pagar

## Objetivo

Corrigir a leitura operacional de contas estornadas e finalizar o refinamento visual e de exportação do Contas a Pagar sem alterar a arquitetura dos serviços existentes.

## Ajustes implantados

- Parcelas de conta estornada não são mais apresentadas como quitadas.
- Situação da parcela agora é calculada a partir do estado da conta e dos valores efetivamente pagos.
- Conta estornada exibe aviso próprio com data, operador e motivo, quando disponível.
- Ações de pagar e alterar forma permanecem bloqueadas em contas estornadas.
- Cards das parcelas passam a apresentar valor original, pago, restante e situação com melhor hierarquia.
- Histórico foi ordenado do evento mais recente para o mais antigo.
- Alterações de forma mostram parcela e transição entre a forma anterior e a nova.
- Botão Exportar foi movido para junto da contagem e das ações da listagem.
- Relatório destaca contas estornadas e as exclui dos totalizadores financeiros ativos.
- PDF identifica versão, data/hora, operador e informa o total histórico de contas estornadas separadamente.

## Compatibilidade

- Nenhuma estrutura JSON foi removida ou reescrita.
- Contas antigas continuam utilizando a forma geral como fallback quando a parcela não possui forma própria.
- Pagamentos, movimentos de caixa e histórico existentes permanecem preservados.
- O saldo armazenado em uma conta estornada não é regravado; a interface passa a tratá-lo como valor histórico e não como obrigação ativa.

## Arquivos alterados

- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Arquivo novo

- `docs/QUALITY-ERP-v0.18.7.1-ESTORNOS-E-REFINAMENTO-FINAL.md`

## Validações

- Sintaxe JavaScript validada com `node --check`.
- Estrutura EJS revisada sem alteração de includes ou layout base.
- Conferidos os estados: aberta, parcial, quitada e estornada.
- Conferida a separação dos totais ativos e valores estornados na exportação.
