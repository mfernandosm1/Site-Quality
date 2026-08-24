# Quality ERP v0.27.0 — Modelos nativos de impressão editáveis

## Objetivo
Transformar os comprovantes já existentes de Venda, O.S. de Entrada e O.S. de Saída em modelos reais da Central de Impressões, permitindo editar textos e formatação sem alterar código.

## Alterações
- Criação automática dos modelos de sistema:
  - Venda — Padrão;
  - O.S. Entrada — Padrão;
  - O.S. Saída — Padrão.
- Os modelos são carregados com os textos e campos já usados pelo ERP.
- Modelos do sistema podem ser editados, formatados, duplicados e restaurados.
- Exclusão de modelos do sistema é bloqueada.
- Alterações de conteúdo mantêm histórico das últimas 10 versões no arquivo de modelos.
- O PDV passa a priorizar os modelos salvos na Central de Impressões.
- Variáveis estruturadas adicionadas para tabela de itens, pagamentos, blocos da O.S. e senhas de desenho.
- HTML de formatação do editor é respeitado na impressão, permitindo negrito, itálico, sublinhado e tamanho de fonte.

## Arquivos modificados
- `routes/erp.js`
- `views/configuracoes_comprovantes.ejs`
- `views/pdv.ejs`

## Testes recomendados
1. Reiniciar o painel.
2. Abrir Configurações > Comprovantes e Impressões.
3. Confirmar que aparecem os três modelos com indicação “Modelo do sistema”.
4. Abrir O.S. Entrada — Padrão, aplicar negrito em um trecho e salvar.
5. Abrir uma O.S. no PDV, imprimir Entrada da O.S. e conferir a formatação.
6. Testar O.S. Saída — Padrão antes de editar o texto definitivo.
7. Duplicar um modelo do sistema e confirmar que a cópia pode ser excluída.
8. Usar Restaurar padrão em um modelo do sistema e conferir o retorno do conteúdo original.
