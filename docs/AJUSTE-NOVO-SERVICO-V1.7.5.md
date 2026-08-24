# Quality ERP — V1.7.5 — Novo Serviço

## Correção
Ao escolher **＋ Novo produto → Serviço**, a tela agora recebe o tipo pelo backend e já é renderizada como cadastro de serviço.

- seleciona automaticamente a primeira Categoria ERP ativa com `type: service` (na base atual: **Serviços**);
- título passa a ser **Novo serviço**;
- unidade padrão passa a ser **SER - Serviço**;
- controle de estoque inicia desmarcado;
- disponibilidade de estoque para o site inicia como **Não disponibilizar**;
- o rótulo de situação passa a indicar **Serviço ativo no ERP**;
- se não existir categoria ERP ativa do tipo Serviço, exibe aviso claro em vez de fingir que o cadastro foi preparado.

## Causa
A V1.7.4 dependia apenas do JavaScript do navegador para localizar e selecionar a categoria de serviço após a navegação. A escolha agora é resolvida também no servidor, antes de o HTML ser enviado, deixando o fluxo determinístico e compatível com recarregamento da página.

## Arquivos alterados
- `routes/produtos.js`
- `views/produtos.ejs`

## Teste rápido
1. Abra `/produtos`.
2. Clique em **＋ Novo produto**.
3. Escolha **Serviço**.
4. Confirme que abre **Novo serviço** e que **Categoria ERP = Serviços** já está selecionada.
5. Confirme que a unidade padrão é **SER - Serviço** e o controle de estoque está desmarcado.
