# Quality ERP v0.17.1.3 — Refinamento Visual do Parcelamento

## Objetivo
Corrigir o posicionamento do botão de configuração de parcelas no PDV sem alterar a lógica já validada de geração de títulos, recebimentos, Caixa ou Financeiro.

## Alterações
- Botão de configuração alinhado na mesma linha da forma de pagamento, valor e quantidade de parcelas.
- Remoção da sobreposição visual sobre o campo de parcelas.
- Botão oculto quando a quantidade for igual a 1.
- Botão exibido somente para formas que geram Contas a Receber e possuem 2 ou mais parcelas.
- Texto inicial compacto: `⚙ Configurar`.
- Após salvar a configuração, o botão passa a indicar `✓ Configuradas`.
- Alterar o valor ou a quantidade de parcelas remove o estado de configuração concluída, exigindo nova conferência.
- Comportamento responsivo preservado para telas menores.

## Implantação
Substituir os arquivos mantendo a estrutura de pastas dentro de `C:\Site\painel`.

Copiar esta documentação para `C:\Site\docs`, conforme o padrão do projeto.

## Testes recomendados
1. Selecionar Boleto/crediário com 1 parcela e confirmar que o botão permanece oculto.
2. Alterar para 2 ou mais parcelas e confirmar que o botão aparece alinhado.
3. Configurar e salvar as parcelas; confirmar a indicação `✓ Configuradas`.
4. Alterar o valor ou a quantidade; confirmar que a indicação volta para `⚙ Configurar`.
5. Finalizar uma operação e conferir que os títulos continuam sendo gerados normalmente.
