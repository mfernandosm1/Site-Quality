# Quality ERP v0.21.9 — Polimento Final da Listagem

## Escopo concluído

- Remoção definitiva do botão **Salvar outras alterações pendentes** e da lógica JavaScript vinculada a ele.
- ERP e Loja Virtual continuam com salvamento imediato pelos controles próprios.
- Melhoria da responsividade da tabela, preservando rolagem horizontal controlada em telas menores.
- Refinamento de larguras, alinhamentos, espaçamentos, checkboxes, botões e colunas.
- Revisão visual para os modos Claro e Black OLED.
- Confirmação simplificada das operações em lote, por exemplo: **3 produtos alterados**.
- Tooltips revisados nas ações de selecionar, inverter e limpar seleção.

## Arquivos alterados

- `views/produtos.ejs`
- `routes/produtos.js`

## Próxima etapa planejada

### Quality ERP v0.22.0 — Cadastro Mestre de Produtos

Primeira etapa somente com o alicerce dos dados ERP:

- Nome ERP
- Nome Loja Virtual
- SKU
- Código interno
- Código fornecedor
- Código de barras
- Marca
- Unidade
- Categoria
- Subcategoria
- Controla estoque
- Estoque mínimo
- Permite estoque negativo

Os campos menos utilizados deverão ficar em uma área recolhível, evitando uma tela extensa. Marketplace e expansões omnichannel permanecem fora desta etapa inicial.

## Testes rápidos

1. Abrir Produtos nos modos Claro e Black OLED.
2. Confirmar que o botão antigo não aparece mais.
3. Reduzir a largura da janela e verificar a tabela sem sobreposição de conteúdo.
4. Filtrar produtos e testar selecionar visíveis, inverter e limpar seleção.
5. Aplicar uma ação em lote em três produtos e confirmar a mensagem **3 produtos alterados**.
6. Alterar ERP e LV individualmente e confirmar o salvamento imediato.
