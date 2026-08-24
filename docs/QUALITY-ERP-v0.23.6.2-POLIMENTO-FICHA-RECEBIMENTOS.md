# Quality ERP v0.23.6.2 — Polimento da Ficha de Recebimentos

## Objetivo
Refinar a ficha completa do título do Contas a Receber, reduzindo excesso visual e corrigindo o comportamento da janela e do crediário no modo Claro.

## Alterações
- Janela da ficha centralizada horizontalmente, sem deslocamento para a direita.
- Remoção da barra de navegação Operação/Cliente/Produtos/Parcelas/Recebimentos/Timeline.
- Dados principais do cliente posicionados no topo da ficha.
- Resumo de valor, saldo e situação mantido logo abaixo do cliente.
- Seções operacionais recolhidas por padrão.
- Consolidação de Operação, produtos e condição da venda em um único bloco.
- Renomeação de “Parcelas geradas” para “Parcelas”.
- Renomeação de “Timeline completa” para “Histórico”.
- Remoção do bloco duplicado de histórico financeiro da ficha.
- Ações de imprimir e WhatsApp convertidas em ícones com tooltip e acessibilidade.
- Correções de contraste do crediário no modo Claro, incluindo tabela e indicadores de situação.

## Arquivos alterados
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`

## Compatibilidade
Nenhuma estrutura de dados, rota ou serviço foi alterado. A atualização é exclusivamente de interface e reaproveita os fluxos existentes de recebimento, impressão, WhatsApp e estorno.
