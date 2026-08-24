# Quality ERP — v0.10.10

## CRM / Automação WhatsApp

- Removida a aba exclusiva **Simulador** da navegação da Automação WhatsApp.
- O simulador continua dentro de **Blocos**, agora com seletor de blocos salvos no topo da prévia.
- O seletor permite simular um bloco salvo sem sair do editor; deixando em **Bloco atual / em edição**, a simulação usa o fluxo que está sendo montado.
- O texto “Simule o bloco inteiro ou use ‘Testar etapa’ dentro de cada card.” foi movido para um ícone de informação ao lado de **Prévia do bloco**.

## Fluxo de Caixa Inteligente

- Corrigido o enriquecimento de movimentos de **Contas a Pagar / Contas a Receber**: quando o movimento do caixa possui apenas o vínculo técnico, o Fluxo de Caixa passa a consultar o título financeiro relacionado e recuperar nome/documento do fornecedor ou cliente, classificação e observações disponíveis.
- O drawer de detalhes passa a exibir também o documento do cliente/fornecedor quando disponível.
- **Estornos não entram mais nos cards de Entradas realizadas / Saídas realizadas.** Eles continuam na linha do tempo e continuam afetando o saldo real do caixa, pois representam a reversão financeira efetivamente ocorrida.
- No conjunto de dados atual usado para validação, as Entradas realizadas de agosto passam de R$ 17.068,35 para **R$ 16.844,79**, excluindo R$ 223,56 de estornos do indicador operacional.
- Os filtros **Forma de pagamento**, **Origem** e **Classificação financeira** agora aceitam múltipla seleção por checkbox.
- É possível, por exemplo, selecionar simultaneamente **Venda + Ordem de serviço**.
- A mesma lógica de múltipla seleção foi aplicada a formas de pagamento, centros de custo e planos de contas.
- O resumo usado nas exportações considera todas as opções marcadas.

## Compatibilidade

- Mantida compatibilidade com query string de seleção única já existente.
- O endpoint do Fluxo de Caixa também aceita arrays/múltiplos valores nos filtros.
- Versão visual do Fluxo de Caixa atualizada para **0.26.2**.
