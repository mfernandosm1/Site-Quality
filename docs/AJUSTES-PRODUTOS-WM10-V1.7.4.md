# Quality ERP — Produtos / WM10 V1.7.4

## Correções

### Troca rápida da foto principal
- O clique na miniatura da listagem agora usa um listener delegado independente do restante do JavaScript da tela.
- Ao clicar na foto, o seletor de arquivo abre; após selecionar uma imagem, ela é enviada para `/produtos/quick-main-image` e passa a ser a foto principal.
- Mantém a rota e o backup já implementados na V1.7.3.

### Novo produto: Produto ou Serviço
- O botão `＋ Novo produto` agora abre de forma resiliente a escolha `Produto` / `Serviço`.
- `Produto` abre o cadastro normal.
- `Serviço` abre o cadastro com `type=service` e seleciona automaticamente a primeira Categoria ERP ativa do tipo Serviço.

## Migração WM10 — Produto ou Serviço

A API do WM10 não precisa informar o tipo. A decisão fica com o usuário.

- Padrão: **Produto**.
- Na triagem individual, cada item selecionável possui a opção **Importar como serviço**.
- Em uma família, existe o campo **Tipo de cadastro: Produto / Serviço**.
- Ao importar como Serviço, o Quality vincula automaticamente a primeira Categoria ERP ativa do tipo Serviço, desativa controle de estoque e não aplica estoque WM10.
- Se não existir nenhuma Categoria ERP ativa do tipo Serviço, a importação é bloqueada com mensagem clara em vez de cadastrar incorretamente.

## Arquivos alterados
- `views/produtos.ejs`
- `views/produtos_importar_wm10.ejs`
- `routes/produtos.js`
- `services/wm10-product-import-service.js`

## Checklist de teste
- [ ] Em Produtos, clicar na miniatura abre o seletor de imagem.
- [ ] Selecionar uma imagem atualiza a foto principal e permanece após F5.
- [ ] `＋ Novo produto` abre a escolha Produto / Serviço.
- [ ] Produto abre o cadastro normal.
- [ ] Serviço abre com uma Categoria ERP de Serviço selecionada e estoque desativado.
- [ ] Na migração WM10 individual, marcar `Importar como serviço` importa o item como Serviço.
- [ ] Na família WM10, selecionar `Serviço`, aprovar e importar mantém o cadastro como Serviço.
- [ ] Produtos continuam sendo o padrão quando nenhuma opção de Serviço é marcada.
- [ ] Black OLED e Claro.
