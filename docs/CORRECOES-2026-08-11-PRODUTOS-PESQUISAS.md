# Quality ERP — correções Produto/Serviço e pesquisas

Data: 11/08/2026
Revisão: v0.12.3.16

## 1. Novo Produto/Serviço — delay visual

Problema observado:
- ao abrir o cadastro, vários blocos apareciam abertos por alguns segundos e depois se reorganizavam;
- na correção anterior, o conteúdo passou a ficar comprimido no lado esquerdo.

Correção definitiva desta revisão:
- o bootstrap das abas do cadastro acontece imediatamente após o HTML do formulário terminar de ser interpretado;
- o formulário permanece invisível somente durante essa montagem imediata, evitando o flash de todos os blocos;
- o container principal das abas e o rodapé foram fixados em 100% da largura;
- não há `setTimeout` para montar o layout;
- a estrutura de salvamento, nomes dos campos e rotas existentes foram preservados.

Arquivo principal:
- `views/produtos.ejs`

## 2. Seletor Produto ou Serviço

Problema observado:
- depois de entrar uma vez em Novo Produto, clicar novamente em Novo Produto não abria mais a escolha Produto/Serviço.

Causa:
- havia uma condição explícita que ignorava o clique quando `workspace=new` já estava na URL.

Correção:
- o botão `Novo produto` sempre abre o seletor Produto/Serviço;
- funciona tanto vindo da listagem quanto já estando dentro do cadastro;
- Produto abre `?workspace=new&type=product`;
- Serviço abre `?workspace=new&type=service`.

## 3. Pesquisa do PDV

A pesquisa do PDV agora usa diretamente a mesma lógica aprovada na listagem de Produtos, sem depender de utilitário global para funcionar.

Regras:
- ignora acentos;
- ignora maiúsculas/minúsculas;
- ignora pontuação;
- separa a consulta em palavras;
- cada palavra digitada pode casar com o início de uma palavra do cadastro.

Exemplos validados:
- `pelicula i` encontra `Película de iPhone`;
- `película iph` encontra `Película 3D iPhone`;
- `joao sil` encontra `João da Silva`;
- `gal a15` encontra `Samsung Galaxy A15`.

Também foi aplicada ao modal de clientes e à busca de operações dentro do PDV.

Arquivo:
- `views/pdv.ejs`

## 4. Padronização das demais pesquisas

Mantida a revisão anterior para pesquisas em outras áreas do ERP, usando normalização equivalente no frontend e backend.

Arquivos auxiliares:
- `public/js/search-utils.js` — utilitário do navegador;
- `utils/search.js` — utilitário do backend.

IMPORTANTE: a pasta `utils` fica na raiz do projeto, no mesmo nível de `views`, `routes`, `services`, `public` e `server.js`.

## 5. Como aplicar

Extraia o conteúdo deste ZIP diretamente sobre a raiz do Quality ERP, mantendo as pastas do arquivo ZIP e permitindo substituir/mesclar os arquivos existentes.

Não mova arquivos individualmente para pastas diferentes das que já vêm no ZIP.

## 6. Testes recomendados

1. Abrir Produtos > Novo produto e verificar se o formulário já aparece organizado e em largura normal.
2. Clicar novamente em Novo produto estando dentro do cadastro e confirmar que a escolha Produto/Serviço abre de novo.
3. Escolher Produto e depois repetir escolhendo Serviço.
4. No PDV, pesquisar `pelicula i` e confirmar que produtos como `Película de iPhone` aparecem.
5. No PDV, pesquisar cliente sem acento, por exemplo `joao`, para encontrar `João`.
