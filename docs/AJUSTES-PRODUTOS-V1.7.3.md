# Quality ERP — Produtos V1.7.3

## Ajustes desta entrega

### Organização da tela
- Removido o bloco textual `ERP · Produtos / Cadastro mestre separado por ERP...`.
- `Produtos cadastrados`, `Novo produto`, `Migração WM10` e `Voltar ao ERP` agora compartilham a mesma barra de ações.

### Novo produto ou serviço
- Ao clicar em `＋ Novo produto` na listagem, o painel pergunta se o novo cadastro é **Produto** ou **Serviço**.
- Produto abre o cadastro normal.
- Serviço abre o mesmo cadastro mestre e pré-seleciona a primeira Categoria ERP ativa do tipo `service`.
- A regra já existente de categoria Serviço desativa o controle físico de estoque.
- Se não existir categoria ERP ativa do tipo Serviço, o cadastro abre normalmente para o usuário escolher/criar a categoria adequada.

### Foto principal rápida
- A miniatura da listagem de Produtos agora é clicável.
- Ao clicar, o usuário escolhe uma imagem e ela vira a foto principal do produto sem precisar abrir o modal completo.
- O upload usa a infraestrutura já existente de imagens de produto (`images/produtos`).
- Antes da alteração de `products.json` é criado backup pelo mecanismo existente.

## Importação WM10 — Produto x Serviço
A documentação de Produto do WM10 fornecida nesta etapa retorna código, barras, nome, preços, unidade, estoque, referência, cor, tamanho, marca, coleção, ativo e datas. Não há um campo explícito indicando `produto` ou `serviço` nesse retorno.

Por segurança, esta versão **não tenta adivinhar automaticamente** se um item do WM10 é serviço apenas pelo nome. Uma evolução recomendada é permitir a classificação `Produto / Serviço` durante a revisão da família ou da importação, vinculando Serviço a uma Categoria ERP do tipo `service`.

## Arquivos alterados
- `views/produtos.ejs`
- `routes/produtos.js`

## Checklist sugerido
- [ ] Botões Produtos / Novo / Migração / Voltar ao ERP estão na mesma linha.
- [ ] Não aparece mais o texto `ERP · Produtos`.
- [ ] `＋ Novo produto` pergunta Produto ou Serviço.
- [ ] Escolher Serviço pré-seleciona uma categoria ERP de serviço quando existir.
- [ ] Serviço continua sem controle de estoque.
- [ ] Clique na miniatura permite carregar nova foto principal.
- [ ] Foto permanece após atualizar a página.
- [ ] Testar em tema Claro e Black OLED.
