# Quality ERP v0.17.2 — Histórico Completo da Venda/O.S.

## Objetivo
Transformar o painel lateral do Contas a Receber em uma ficha operacional e financeira completa, reaproveitando os snapshots, timelines, parcelas e recebimentos já persistidos pelo ERP.

## Alterações
- Ajustado o botão **Configurar parcelas** para uma linha própria abaixo de Forma de pagamento, Valor e Parcelas.
- Estado configurado exibido como **✓ Parcelas configuradas**, com resumo do número de parcelas.
- Ampliado o painel lateral do Contas a Receber.
- Adicionada navegação rápida por Operação, Cliente, Produtos, Parcelas, Recebimentos e Timeline.
- Seções organizadas em cards recolhíveis.
- Exibidos abertura, finalização, operador, vendedor principal, vendedores por item e situação.
- Exibidos produtos, quantidade, unitário, desconto, subtotal e observações existentes.
- Exibidos pagamentos originais e parcelas geradas.
- Exibido histórico de recebimentos com juros, multa, desconto, operador, caixa e comprovante.
- Para O.S., exibidos equipamento, marca, modelo, acessórios, defeitos, serviços, check-in e checkout.
- Timeline unificada com eventos da operação, título e recebimentos.

## Compatibilidade e estabilidade
- Nenhum formato JSON foi alterado.
- Nenhuma migração de dados é necessária.
- A implementação utiliza os serviços existentes de comércio, clientes e contas a receber.
- Campos antigos de O.S. continuam suportados por aliases de leitura.

## Arquivos alterados
- `views/pdv.ejs`
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`
- `routes/erp.js`
- `docs/QUALITY-ERP-v0.17.2-HISTORICO-COMPLETO.md`
