# Quality ERP v0.27.1 — Renderer único de impressão

## Objetivo
Garantir que a pré-visualização da Central de Impressões use exatamente o mesmo motor dos comprovantes impressos no PDV.

## Alterações
- Criado `public/js/erp-print-renderer.js` como motor compartilhado.
- O PDV usa o motor compartilhado para modelos editáveis e modelos nativos.
- A Central de Impressões usa o mesmo motor em um `iframe` isolado.
- Removido o cabeçalho fixo da prévia que repetia “Quality Celulares”.
- Removida a substituição de variáveis por traços artificiais.
- A prévia agora respeita HTML, negrito, estrutura, logo, status, itens, total, termos e senhas de desenho.
- Linhas da prévia passam a vir apenas do próprio modelo/CSS real de impressão.

## Arquivos alterados
- `views/configuracoes_comprovantes.ejs`
- `views/pdv.ejs`

## Arquivo novo
- `public/js/erp-print-renderer.js`

## Testes recomendados
1. Reiniciar o painel.
2. Abrir Configurações > Comprovantes e Impressões.
3. Selecionar O.S. Entrada — Padrão.
4. Confirmar que “Quality Celulares” aparece somente uma vez.
5. Aplicar negrito em um trecho e salvar.
6. Comparar a prévia com a impressão aberta pelo PDV.
7. Repetir com Venda — Padrão e O.S. Saída — Padrão.
8. Conferir Black OLED e Claro.
