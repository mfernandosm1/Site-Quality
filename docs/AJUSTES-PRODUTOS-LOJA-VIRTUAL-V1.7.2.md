# Quality ERP — Produtos V1.7.2

## Objetivo
Separar corretamente campos internos do ERP dos campos exclusivos da Loja Virtual e simplificar o cabeçalho da listagem de produtos.

## Alterações aplicadas

### 1. Campos da Loja Virtual movidos para a aba correta
No modal de edição, foram removidos da aba **ERP** e movidos para **Loja Virtual / SEO**:
- Slug / URL amigável;
- Categoria Loja Virtual;
- Subcategoria Loja Virtual;
- Mostrar preço;
- Vitrine;
- Ver detalhes;
- Mostrar variações no card do site.

No cadastro de novo produto, os mesmos campos passam a respeitar a aba **Loja Virtual** em vez de caírem na aba ERP por causa do organizador dinâmico do formulário.

### 2. Produto pode ficar sem Categoria Loja Virtual
A opção vazia agora é apresentada como **Sem categoria**. O valor continua vazio no cadastro, portanto não cria categoria fictícia nem força o produto para "Início (vitrine)".

A listagem também passa a exibir **Sem categoria** quando o produto não possui categoria da Loja Virtual.

### 3. Slug sem duplicidade visual
O slug permanece sendo salvo pelo mesmo campo existente, mas agora fica apenas no contexto de **Loja Virtual / SEO** no modal de edição. O segundo campo visual de URL canônica/slug foi removido para evitar duas entradas editando o mesmo dado.

### 4. Cabeçalho da listagem simplificado
Foi removido o texto:
- Workspace de Produtos;
- Consulte a base ou abra um cadastro sem misturar as duas tarefas.

Foram preservados os botões:
- Produtos cadastrados;
- Novo produto.

## Ideias registradas para evolução futura
Não implementadas nesta entrega para manter a alteração pequena e segura:

1. **Foto principal rápida pela listagem**
   - clicar diretamente na miniatura do produto;
   - selecionar/enviar uma imagem;
   - definir como foto principal sem abrir todo o cadastro.

2. **Novo produto: Produto ou Serviço**
   - ao clicar em `+ Novo produto`, perguntar `Produto` ou `Serviço`;
   - escolhendo Serviço, pré-selecionar automaticamente a categoria ERP de Serviços e aplicar comportamento sem estoque quando pertinente.

## Arquivos alterados
- `views/produtos.ejs`

## Checklist sugerido
- [ ] Editar produto e confirmar que Categoria Loja Virtual não aparece mais na aba ERP.
- [ ] Abrir Loja Virtual / SEO e confirmar os campos movidos.
- [ ] Selecionar `Sem categoria`, salvar, reabrir e confirmar que permanece sem categoria.
- [ ] Alterar slug pela aba Loja Virtual / SEO e salvar.
- [ ] Abrir Novo produto e confirmar que Slug/Categoria/Subcategoria/Mostrar preço/Vitrine ficam na aba Loja Virtual.
- [ ] Confirmar que os botões Produtos cadastrados e Novo produto permanecem na listagem.
- [ ] Testar Black OLED e tema Claro.
