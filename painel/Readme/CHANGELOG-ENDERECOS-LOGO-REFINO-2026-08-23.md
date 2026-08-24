# Quality ERP — Endereços e logo — 23/08/2026

## Endereços

- Removida completamente a base de clientes e fornecedores do ERP como fonte de sugestão de logradouros.
- Sugestões agora usam somente fontes externas de endereço/mapa (ViaCEP e OpenStreetMap, com Overpass como fallback).
- CEP informado continua sendo o escopo principal: resultados com CEP conhecido diferente são descartados.
- CEPs gerais de cidades pequenas ganham fallback por vias mapeadas da cidade quando o ViaCEP não lista logradouros.
- Busca por termos genéricos como `rua`, `avenida` e buscas parciais como `rua pre` foi reforçada.
- Duplicidades de grafia da mesma via são consolidadas antes de chegar ao usuário.
- Números de imóvel não são usados como nome de logradouro nas sugestões.
- Bairro é preenchido somente quando uma fonte externa confiável o informa; o ERP não tenta mais inferir bairro a partir de cadastros antigos.

## Logo da empresa

- Editor ganhou opção **Remover fundo branco/claro**.
- O editor detecta automaticamente imagens com fundo claro e sugere a remoção.
- Ao salvar, a área branca/clara é convertida em transparência no PNG final.
- Logo do cabeçalho ganhou acabamento mais leve, sem caixa/fundo próprio e com cantos discretamente refinados.
- Logos já salvas podem ser reenquadradas e convertidas para fundo transparente pelo botão **Reenquadrar logo atual**.
