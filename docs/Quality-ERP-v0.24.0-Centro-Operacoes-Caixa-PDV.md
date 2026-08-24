# Quality ERP v0.24.0 — Centro de Operações, Caixa Operacional e Configurações do PDV

## Objetivo
Consolidar Centro de Operações, estornos, Caixa e regras por caixa como base para NFC-e e emissão fiscal.

## Centro de Operações
- Menu Gerenciar agrupado e sem dependência de deslocamento horizontal.
- Ações: ficha, impressão, duplicação, estorno e documento fiscal preparado.
- Seleção à direita e estorno em lote somente para operações concluídas.
- Filtros rápidos padronizados para todas, abertas, concluídas, canceladas e estornadas.

## Estornos
- Estornos reutilizam estoque, caixa, financeiro, contas a receber e histórico existentes.
- Dinheiro valida a regra específica do caixa. Pix, cartões, boleto e crediário não dependem de saldo físico da gaveta.
- Caixa negativo pode ser bloqueado ou autorizado; quando configurado, exige motivo.
- Processamento permanece transacional com restauração dos arquivos em caso de falha.

## Caixa Operacional
Cards separados: Saldo atual, Recebido hoje, Recebido no turno, Saídas hoje, Estornos hoje e Total esperado.
“Recebido hoje” usa a data local America/Sao_Paulo e desconta estornos registrados no dia. “Recebido no turno” considera apenas a sessão aberta.

## Configurações do Caixa e PDV
Nova rota `/erp/configuracoes/caixa-pdv`, com configuração independente por caixa: fechamento, caixa negativo, caixa padrão, conferência, vendedor, parcelas, tipo padrão, colunas, formas de pagamento, usuários e vendedores autorizados.

## Conferência da venda
Quando habilitada, cada item exibe “Verificado”. O frontend e o serviço bloqueiam a finalização enquanto existir item não conferido.

## Estorno em lote
A tela seleciona somente operações concluídas. Cada item do lote executa o mesmo fluxo transacional do estorno individual e informa sucessos e falhas.

## Compatibilidade
Configurações antigas são migradas em leitura com valores padrão, sem alterar operações, sessões ou movimentos existentes.


## Correção v0.24.0.1

- Corrigida colisão da variável `settings` com o mecanismo de layout EJS na tela Configurações do Caixa/PDV.
- Corrigido erro de sintaxe que interrompia todo o JavaScript do PDV.
- Menu Gerenciar convertido em menu suspenso junto à operação, sem faixa horizontal abaixo da tabela.
- Corrigidos contraste e fundo da coluna de seleção no modo Claro.

## Correção v0.24.0.2 — impressão e política de estoque

- Ajustado o cupom não fiscal para impressão térmica em largura de 80 mm, com fonte legível e margens próprias para comprovante.
- Produtos legados sem categoria ERP deixam de bloquear alterações independentes de estoque.
- Restaurado o salvamento individual da opção “Permitir vender com estoque zerado/negativo”.
- Adicionada ação em lote “Venda sem saldo”, permitindo habilitar ou bloquear a regra nos produtos selecionados sem alterar o saldo atual.

## Correção v0.24.0.3 — impressão e venda sem saldo

- A finalização do PDV passa a consultar também a política atual do cadastro do produto.
- Operações abertas criadas antes da alteração da política de estoque deixam de carregar uma regra antiga de forma definitiva.
- Quando `inventory.allowNegative` estiver habilitado no produto, a validação e a baixa de estoque autorizam saldo zerado ou negativo.
- O comprovante não fiscal de venda foi refeito para impressão térmica de 80 mm, com cabeçalho, situação da operação, identificação, itens, total, pagamentos e observações.
- Operações ainda abertas são identificadas visualmente como `EM ABERTO`, evitando confusão com venda concluída.

## Correção v0.24.0.4 — PDV e formatos de impressão

- Corrigida a renderização do PDV: a rota agora envia `cashboxSettings` para a view em todos os acessos do PDV.
- A janela de impressão passou a permitir escolher o formato:
  - Cupom térmico de 80 mm;
  - Folha A4, adequada para impressoras tanque de tinta como a Epson L3210.
- O último formato utilizado fica salvo localmente no navegador.
- O modelo A4 inclui cabeçalho, dados da operação, itens, pagamentos, observações e campos de assinatura.
- O modelo térmico mantém conteúdo compacto e apropriado para bobina.
