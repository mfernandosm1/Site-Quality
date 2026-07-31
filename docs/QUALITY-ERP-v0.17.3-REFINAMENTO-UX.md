# Quality ERP v0.17.3 — Refinamento UX

## Escopo
Pacote exclusivamente visual e de experiência do usuário no PDV e no Contas a Receber, preservando as regras de negócio e os serviços existentes.

## PDV — parcelamento
- Para uma parcela geradora de contas a receber, o botão de configuração fica oculto.
- O vencimento passa a ser exibido e editado diretamente na linha da forma de pagamento.
- O modal não é aberto quando existe somente uma parcela.
- Ao selecionar duas ou mais parcelas, o vencimento em linha é ocultado e o modal é aberto automaticamente.
- Após fechar o modal, o botão de configuração permanece disponível.
- O botão agora ocupa toda a largura da linha, tem maior altura, hover, ícone destacado e estado configurado com borda verde.
- O resumo informa distribuição igual ou configuração personalizada.

## Contas a Receber — Recebimentos
- Valor, data e hora receberam separação visual mais clara.
- O cabeçalho do recebimento foi reorganizado.
- Juros, multa, desconto, operador, caixa e comprovante foram distribuídos em cards alinhados.
- O botão de impressão ganhou acabamento e melhor área de clique.
- Foram incluídos ajustes responsivos para telas menores.

## Arquivos alterados
- `views/pdv.ejs`
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`
- `docs/QUALITY-ERP-v0.17.3-REFINAMENTO-UX.md`

## Validações
- `public/js/contas-receber.js`: validado com `node --check`.
- JavaScript embutido de `views/pdv.ejs`: extraído e validado com `node --check`.
- Nenhum serviço, rota ou regra financeira foi alterado.
