# Quality ERP v0.25.x — Organização ERP × Categoria LV

## Objetivo
Separar visualmente, na listagem de produtos, as informações internas do ERP das informações públicas da Loja Virtual, sem alterar vínculos ou dados existentes.

## Alterações
- A coluna antiga **Categoria / Estoque** foi reorganizada para **ERP / Estoque**.
- A área ERP agora mostra somente:
  - Categoria ERP;
  - Tipo da categoria: Produto, Serviço ou Produto Controlado;
  - Estoque, apenas quando aplicável.
- Serviços não exibem quantidade ou alerta de estoque na listagem.
- A área LV passou a mostrar:
  - **Categoria LV**, somente quando a Loja Virtual estiver ativa;
  - **Subcategoria LV**, quando houver;
  - badge discreto **LV Inativa** quando o produto não estiver publicado.
- Os vínculos de Categoria LV e Subcategoria LV continuam preservados e são editados pelo cadastro mestre do produto.
- A mudança de status LV na própria listagem atualiza a organização visual sem exigir recarregamento.
- A impressão das Categorias ERP passou a usar iframe interno, evitando bloqueio de pop-up.

## Arquivos alterados
- `C:\Site\painel\views\produtos.ejs`
- `C:\Site\painel\public\js\erp-categories.js`

## Checklist de teste
1. Abrir `Produtos` no tema Claro.
2. Confirmar que Categoria ERP não aparece misturada com Categoria LV.
3. Em produto LV ativo, confirmar a exibição de **Categoria LV** e, se houver, **Subcategoria LV**.
4. Em produto LV inativo, confirmar apenas o badge **LV Inativa**.
5. Alterar o status LV na listagem e confirmar que os controles aparecem/desaparecem corretamente.
6. Conferir que serviço não mostra quantidade ou aviso de estoque.
7. Conferir que produto continua mostrando saldo e situação do estoque.
8. Repetir os testes no Black OLED.
9. Abrir `ERP → Categorias ERP` e testar `Imprimir / PDF` sem liberar pop-ups.
10. Editar um produto e confirmar que os vínculos ERP e LV permanecem salvos.
