# Migração WM10 — Famílias e variações V1.1

## Objetivo

Acelerar a revisão de famílias grandes de produtos durante a migração do WM10, sem alterar a lógica de aprovação já existente.

## Ajuste desta versão

Dentro de cada família detectada foi adicionada seleção em massa por checkbox.

Ações disponíveis:

- Selecionar todos.
- Limpar seleção.
- Inverter seleção.
- Aplicar aos selecionados uma única classificação: Variação / filho, Duplicado, Manter separado ou Não importar.
- Não importar os não selecionados.

O Produto pai continua sendo uma decisão individual. As ações em massa não sobrescrevem um item que já esteja marcado como Produto pai.

### Fluxo rápido recomendado

Para uma família com muitos registros em que apenas poucos serão aproveitados:

1. Marque os 2 ou 3 registros que deseja manter.
2. Clique em **Não importar os não selecionados**.
3. Defina individualmente o Produto pai.
4. Classifique os demais escolhidos como Variação / filho, quando necessário.
5. Clique em **Aprovar família**.

Para transformar muitos itens em filhos de uma vez:

1. Marque os registros desejados.
2. Escolha **Variação / filho** na ação em massa.
3. Clique em **Aplicar aos selecionados**.

## Segurança

- Nenhum dado é gravado no Quality apenas por marcar checkboxes ou aplicar uma ação em massa na tela.
- A decisão da família continua sendo persistida somente ao clicar em **Aprovar família** / **Salvar alterações**.
- A seleção em massa não escolhe Produto pai automaticamente.
- A ação **Não importar os não selecionados** preserva o Produto pai atual.

## Arquivo alterado

- `views/produtos_importar_wm10.ejs`

Não houve necessidade de alterar rotas ou services nesta etapa.
