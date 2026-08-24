# Quality ERP — Produtos + Centro de Operações V4

Data: 11/08/2026

## Centro de Operações / Dashboard

Corrigida a divergência de período entre Dashboard e Centro de Operações.

Antes, o Centro de Operações sempre filtrava pela data de abertura. Isso fazia uma operação aberta em um dia e finalizada no dia seguinte desaparecer do filtro "Concluídas" do dia da finalização.

Agora a data operacional segue a situação:
- aberta: data de abertura;
- concluída: data de finalização;
- cancelada: data de cancelamento;
- estornada: data de estorno/atualização correspondente.

Caso real validado na base enviada em 11/08/2026:
- Venda #15: R$ 571,06;
- Venda #16: R$ 40,00;
- O.S. #19: R$ 30,00;
- total esperado em Concluídas de 11/08: 3 operações / R$ 641,06.

O serviço retornou exatamente 3 operações e R$ 641,06 após a correção.

## Performance da listagem de Produtos

A listagem deixou de tentar montar toda a base de produtos de uma vez. Foi adicionada paginação no servidor, com 250 produtos por página por padrão.

A busca principal, categoria, status ERP e status Loja Virtual passam a filtrar no servidor para que uma pesquisa continue alcançando toda a base, e não apenas os itens da página atual.

Também foi removida a varredura da pasta de imagens do carregamento inicial. As imagens agora são obtidas pela rota `/produtos/api/images` somente quando um campo/seletor de imagem realmente precisa delas.

Foi eliminado o comportamento antigo de `sincronizarImagensAuto()` que fazia `fetch(window.location.href)` e baixava/renderizava a página inteira de Produtos novamente apenas para descobrir as imagens disponíveis.

O cache da lista de imagens permanece por 30 segundos para evitar novas varreduras de disco em sequência.

## Arquivos alterados

- `routes/produtos.js`
- `services/operations-center-service.js`
- `views/produtos.ejs`
- `Readme/CORRECOES-2026-08-11-PRODUTOS-CENTRO-OPERACOES-V4.md`

## Instalação

Extrair na raiz do projeto Quality ERP e permitir substituir/mesclar os arquivos mantendo as pastas. Reiniciar `npm start` após a substituição, pois existem alterações de rota e serviço backend.
