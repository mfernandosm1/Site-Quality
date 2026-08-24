# Quality ERP v0.25.0.1 — Correção de comprovantes e base de impressão da O.S.

## Correções
- Corrigido o erro `ERR_INVALID_ARG_TYPE` ao abrir `/erp/configuracoes/comprovantes`.
- A variável de tela `settings` foi renomeada para não sobrescrever as configurações internas do Express/ejs-mate.
- Removida a repetição automática de “Documento sem valor fiscal” e do nome da empresa no rodapé do cupom de venda.

## Configurações de impressão
- Upload de logo PNG, JPG ou WEBP, com limite de 2 MB.
- Logo adaptada para cupom térmico e A4.
- Rodapé opcional; vazio não imprime nada na parte inferior.
- Títulos separados para comprovante de entrada e saída da O.S.
- Texto personalizado separado para entrada e saída da O.S.
- Opções de assinatura da O.S. e grade para senha de desenho.

## Impressão
- Venda continua sem campo de assinatura.
- O.S. passa a aplicar logo, nome da empresa, título e textos definidos nas configurações.
- A grade de senha é exibida somente na entrada da O.S. quando habilitada.

## Testes recomendados
1. Abrir `Configurações > Comprovantes e Impressões`.
2. Salvar sem logo e confirmar que a página recarrega sem erro.
3. Enviar uma logo e testar cupom térmico e A4.
4. Imprimir uma venda e confirmar que o rodapé duplicado não aparece.
5. Configurar textos de entrada e saída da O.S.
6. Imprimir uma O.S. de entrada e outra de saída, verificando os textos, assinatura e grade de senha.
