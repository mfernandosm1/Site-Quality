# Comprovantes — tabela de itens padronizada em Venda e O.S.

## Ajustes

- Padronizada a seção de produtos/serviços dos três comprovantes do sistema: **Venda**, **O.S. Entrada** e **O.S. Saída**.
- O.S. Entrada e O.S. Saída passam a usar a mesma tabela compacta da venda, com colunas de **código, produto, quantidade, unitário, desconto e total**.
- Descontos passam a ficar visíveis na própria coluna **Desc.**, reduzindo altura do cupom em relação ao formato por linhas extras.
- Removido somente o prefixo visual `PRD-` dos códigos nos comprovantes. Ex.: `PRD-117` passa a ser impresso como `117`. O código interno do produto não é alterado.
- A regra vale também para a pré-visualização e para o carregamento de Venda/O.S. real nas Configurações de Comprovantes.
- O.S. de entrada mantém a seção pronta mesmo quando produtos/serviços já forem selecionados na abertura.

## Compatibilidade

- Nenhum cadastro de produto foi renumerado.
- Apenas a apresentação do código no comprovante foi compactada.
- Histórico dos modelos de impressão foi preservado.
