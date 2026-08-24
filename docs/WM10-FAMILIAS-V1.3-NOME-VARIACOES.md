# Quality ERP — Migração WM10 · Famílias V1.3

## Objetivo deste ajuste

Corrigir a montagem do produto pai e das variações depois da escolha manual dos registros da família.

A regra agora considera **somente o pai + os registros marcados como Variação/filho**. Registros marcados como Não importar, Duplicado ou Manter separado não influenciam mais o nome nem os atributos da família.

## Regra do nome do produto pai

Se o usuário não editar manualmente o campo "Nome do produto pai", o Quality usa o nome do registro escolhido como pai e remove apenas atributos que realmente variam entre pai/filhos.

Exemplo aprovado:

- Pai: `iPhone 14 Usado 128GB`
- Filho: `iPhone 14 Usado 128GB Branco`
- Filho: `iPhone 14 Usado 128GB Preto`

Resultado:

- Produto: `iPhone 14 Usado 128GB`
- Variações: `Branco`, `Preto`
- Armazenamento 128GB e condição Usado permanecem no produto, pois são fixos nessa família.

Se o nome for editado manualmente na tela, o nome digitado pelo usuário continua tendo prioridade.

## Produto pai como variação

O registro escolhido como pai só vira uma combinação de variação se ele possuir valor em algum atributo que realmente varia.

Exemplo:

- Pai genérico sem cor + filhos Branco/Preto: o pai não cria uma variação "sem cor".
- Pai Preto + filhos Branco/Azul: Preto é preservado como uma das variações e o nome do produto é limpo da cor.

## Capas

Exemplo:

- Produto: `Capa Case iPhone 14`
- Filhos: Verde, Branca, Azul

Resultado: somente Cor é usada na grade de variações.

Também foram adicionadas cores frequentes encontradas na base WM10, como Lilás, Esmeralda, Terracota, Militar e Rose.

## Películas

Foi adicionada uma detecção simples de tipo para acessórios:

- 3D
- Privacidade
- Vidro
- Cerâmica / Cerâmica 3D
- Fosca
- Hidrogel

Exemplo:

- Produto: `Película iPhone 14`
- Variações: 3D, Privacidade, Vidro

No modelo atual de variações do Quality, esse grupo utiliza internamente um campo genérico da grade, exibido com o rótulo **Tipo**.

## Correção de família já importada

Famílias com status **Importada** agora exibem o botão:

`🔧 Corrigir nome e variações`

Esse botão:

1. cria backup do cadastro de produtos;
2. busca novamente os registros WM10 da família;
3. mantém o produto já existente no Quality (mesmo ID/código);
4. corrige o nome e o slug;
5. recalcula somente os atributos que realmente variam;
6. remove da grade o antigo "pai sem cor" quando ele era apenas o cadastro base;
7. preserva IDs de estoque e quantidades das variações que já existiam.

Para corrigir o iPhone 14 já importado: executar nova análise, filtrar/localizar a família `iPhone 14`, abrir a família importada e clicar em **Corrigir nome e variações**.

## Arquivos alterados

- `services/wm10-product-import-service.js`
- `routes/produtos.js`
- `views/produtos_importar_wm10.ejs`

## Testes realizados

- Sintaxe Node validada para service e rota.
- Caso iPhone 14: pai `iPhone 14 Usado 128GB` + filhos Branco/Preto => 1 produto com 2 variações apenas por cor.
- Reparo de família já importada: nome `IPHONE 14` => `iPhone 14 Usado 128GB`, slug atualizado e antiga combinação do pai sem cor removida.
- Caso Película iPhone 14: 3D/Privacidade/Vidro => variações do grupo `Tipo`.
