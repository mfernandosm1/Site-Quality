# Comprovantes — descontos na O.S. e UX de configurações

## Alterações

- O comprovante de saída da O.S. passa a exibir, abaixo de cada produto/serviço com desconto, o valor descontado de forma explícita.
- Itens sem desconto permanecem compactos, sem linhas extras.
- A pré-visualização com dados reais na Central de Impressões usa a mesma regra de apresentação dos descontos.
- O exemplo da pré-visualização foi ajustado para demonstrar visualmente um item com desconto.
- Removida a segunda mensagem duplicada de sucesso da tela de Comprovantes e Impressões.
- A mensagem de sucesso fornecida pelo layout agora aparece como aviso compacto e temporário, desaparecendo após aproximadamente 1,8 s.
- O parâmetro `flash` é removido da URL após a exibição para impedir que o aviso reapareça ao atualizar a página.
- O texto "Central de impressão do Quality ERP..." foi movido para um ícone `i` de informação no cabeçalho.
- O texto "Modelos ativos aparecem nas opções de impressão do PDV." foi substituído por um ícone `i` com tooltip.

## Arquivos alterados

- `views/pdv.ejs`
- `views/configuracoes_comprovantes.ejs`
- `public/js/erp-print-renderer.js`
