# Quality ERP v0.24.0.6 — Centro de Operações e Resumo Financeiro

## Centro de Operações

- O menu **Gerenciar** fecha automaticamente ao clicar fora dele.
- A tecla `Esc` também fecha qualquer menu Gerenciar aberto.
- O comportamento anterior de abrir e fechar pelo próprio botão foi preservado.

## Financeiro

- Removido o cabeçalho azul com as mensagens “Gestão Financeira”, “Infraestrutura protegida” e informações de implantação por etapas.
- Os quatro indicadores superiores passaram a utilizar as movimentações operacionais efetivas do PDV/Caixa.
- Entradas consideram recebimentos de venda, O.S. e baixas de Contas a Receber.
- Saídas consideram sangrias, despesas, pagamentos e estornos registrados no Caixa.
- Movimentações anuladas não entram nos cálculos.
- Datas são apuradas no fuso `America/Sao_Paulo`.
- O saldo operacional é calculado por todas as entradas válidas menos todas as saídas válidas.

## Compatibilidade

Nenhum arquivo de dados foi alterado. A mudança apenas corrige a origem e a apresentação dos cálculos na tela do Financeiro.
