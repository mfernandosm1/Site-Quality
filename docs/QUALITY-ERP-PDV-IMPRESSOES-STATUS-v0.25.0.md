# Quality ERP v0.25.0 — PDV, impressões e status operacionais

## Entrega

- Tela final do PDV simplificada após concluir Venda/O.S.
- Removido o fluxo de “Ver resumo”, o botão “Voltar ao sucesso” e o fechamento que deixava a operação finalizada congelada.
- Ações finais: Menu inicial do ERP, Nova operação, Imprimir comprovante e acesso preparado para transmissão fiscal.
- Cupom de venda sem campos de assinatura.
- Comprovante de venda com dados do cliente: CPF/CNPJ, telefone e endereço.
- Grade detalhada dos itens: código, produto, quantidade, unitário, desconto e total.
- Status personalizados para Venda/O.S., com padrão independente por tipo.
- Nova área Configurações → Status de Vendas e O.S.
- Nova área Configurações → Comprovantes e Impressões.

## Arquivos de dados

- `data/erp/settings/operation-statuses.json`
- `data/erp/settings/print-settings.json`

## Teste rápido

1. Acesse Configurações → Status de Vendas e O.S.; altere um nome, escolha os padrões e salve.
2. Abra uma nova venda e uma nova O.S.; confira o status padrão de cada tipo.
3. Finalize uma venda e teste Menu inicial, Nova operação e Imprimir comprovante.
4. No comprovante, confira CPF/CNPJ, telefone, endereço e as seis colunas dos itens.
5. Confirme que a venda não possui assinaturas e que a impressão de O.S. continua com assinaturas.
6. Acesse Configurações → Comprovantes e Impressões, altere título/rodapé e valide uma nova impressão.

## Observação fiscal

O botão “Transmitir nota” foi preparado na tela final, mas não transmite NFC-e/NF-e nesta versão. A integração fiscal deve ser implementada em etapa própria, preservando a venda já finalizada.
