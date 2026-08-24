# Quality ERP — Preço único ERP em Produtos e Serviços — V1.7.6

## Objetivo
Eliminar a duplicidade de preços no cadastro mestre. Produto e Serviço passam a possuir um único preço operacional no ERP, sem misturar com o preço da Loja Virtual.

## Regra aplicada
- **Preço de venda ERP**: preço-base operacional usado por PDV, Compras/consulta de catálogo e Orçamentos.
- **Preço Loja Virtual**: continua independente, dentro da área Loja Virtual.
- `Preço à vista / PIX` e `Preço parcelado` deixam de ser campos editáveis do produto/serviço.
- Formas de pagamento e futuras taxas por parcela não alteram o cadastro mestre; atuarão na operação.

## Compatibilidade
Os campos legados `commercial.cashPrice` e `commercial.installmentPrice` não foram removidos do JSON. Ao salvar um cadastro, passam apenas a espelhar `commercial.erpPrice`, evitando quebra de leitores antigos até a remoção definitiva em uma migração futura.

Também foi mantido `commercial.salePrice` como espelho do preço ERP para compatibilidade.

## Fontes operacionais
- `services/purchase-service.js`: catálogo operacional prioriza `commercial.erpPrice` em vez do preço da Loja Virtual.
- `routes/orcamentos.js`: produtos carregados em Orçamentos priorizam `commercial.erpPrice`.
- O preço da Loja Virtual continua disponível em `virtualStore.price`/campo LV e não é usado como preço-base operacional por estes fluxos.

## Arquivos alterados
- `views/produtos.ejs` — remove campos duplicados e apresenta somente `Preço de venda ERP` no Comercial.
- `routes/produtos.js` — consolida preço ERP e mantém espelhos legados automaticamente.
- `services/purchase-service.js` — catálogo operacional usa preço ERP como fonte principal.
- `routes/orcamentos.js` — orçamento usa preço ERP como fonte principal.

## Checklist sugerido
1. Criar um Serviço com Preço de venda ERP = R$ 160,00 e Preço Loja Virtual vazio.
2. Confirmar que não aparecem campos separados de preço à vista/parcelado.
3. Abrir o Serviço novamente e confirmar R$ 160,00 em Preço de venda ERP.
4. Pesquisar o Serviço no PDV e confirmar preço-base R$ 160,00.
5. Adicionar o mesmo item a um Orçamento e confirmar preço-base R$ 160,00.
6. Definir Preço Loja Virtual diferente, por exemplo R$ 149,90, salvar e confirmar que PDV/Orçamento continuam em R$ 160,00.
7. Validar tema Claro e Black OLED.
