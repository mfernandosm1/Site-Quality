# Quality ERP v0.16.8 — Correção da listagem do Contas a Receber

## Diagnóstico

As vendas em crediário estavam sendo processadas corretamente. Os títulos das vendas #14 e #15 já existiam em `data/erp/finance/receivables.json`, com parcelas e vínculo operacional.

O problema estava somente na apresentação da tela. Os dados eram enviados dentro de atributos `data-*` do HTML e o JavaScript não concluía a inicialização, deixando o corpo da tabela vazio.

## Alterações

- Substituído o carregamento por atributo HTML por um bloco seguro `application/json`.
- Adicionada renderização inicial das linhas pelo servidor.
- Mantida a atualização e os filtros pelo JavaScript.
- Adicionada proteção para catálogo de formas de pagamento ausente.
- Atualizada a identificação visual para v0.16.8.

## Resultado esperado

Ao abrir `/erp/financeiro/contas-a-receber`, os títulos existentes aparecem imediatamente, inclusive as vendas #14 e #15. A linha e o botão **Detalhes** permanecem clicáveis.

## Instalação

1. Fazer backup de `C:\Site\painel`.
2. Extrair o ZIP em `C:\Site`, preservando as pastas.
3. Reiniciar o painel.
4. Abrir Contas a Receber e confirmar a listagem.
5. Pressionar `Ctrl+F5` caso o navegador mantenha o JavaScript antigo em cache.
