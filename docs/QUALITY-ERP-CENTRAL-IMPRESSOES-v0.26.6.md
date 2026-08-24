# Quality ERP v0.26.6 — Refinamento final da Central de Impressões

## Arquivo alterado

- `views/configuracoes_comprovantes.ejs`

## Ajustes

- removidos os atalhos redundantes de Identidade, Venda, O.S. Entrada e O.S. Saída;
- navegação reduzida a Modelos personalizados e Configurações gerais;
- apenas uma área principal aparece por vez;
- Configurações gerais em formato de acordeão, com apenas uma seção aberta por vez;
- botão de salvar dentro de cada seção;
- indicador de alterações salvas/não salvas no editor;
- preservadas rotas, nomes dos campos, modelos e configurações existentes;
- mantidos Black OLED e modo Claro.

## Teste rápido

1. Substituir o arquivo em `C:\Site\painel\views`.
2. Reiniciar o painel.
3. Abrir Configurações > Comprovantes e Impressões.
4. Alternar entre Modelos personalizados e Configurações gerais.
5. Confirmar que somente uma seção geral abre por vez.
6. Editar um modelo e verificar o indicador “Alterações não salvas”.
7. Salvar e validar que os dados existentes continuam carregando normalmente.
