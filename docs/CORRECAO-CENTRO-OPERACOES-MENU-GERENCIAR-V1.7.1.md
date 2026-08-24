# Quality ERP — Correção Centro de Operações V1.7.1

## Problema

O menu **Gerenciar** do Centro de Operações era renderizado dentro da área rolável da tabela. Em operações próximas ao limite superior ou inferior do card, parte das ações podia ficar recortada pelo `overflow` do container.

## Correção

- O popover de **Gerenciar** agora usa posicionamento fixo em relação à janela.
- Ao abrir, o JavaScript mede o botão e o tamanho real do menu.
- O sistema escolhe automaticamente abrir acima ou abaixo conforme o espaço disponível.
- A posição é limitada às bordas visíveis da janela.
- O menu é reposicionado durante scroll e resize.
- Mantido o comportamento de fechar ao clicar fora, pressionar `Esc`, trocar filtros ou abrir outro menu.
- Removido o artifício de padding extra usado anteriormente para tentar compensar o recorte da tabela.

## Arquivos alterados

- `views/centro_operacoes.ejs`
- `public/css/painel-theme.css`

## Checklist sugerido

- [ ] Abrir **Gerenciar** na primeira operação da tabela.
- [ ] Abrir **Gerenciar** na última operação da tabela.
- [ ] Testar operação aberta, cancelada e concluída.
- [ ] Confirmar que todas as ações aparecem sem corte.
- [ ] Testar scroll com o menu aberto.
- [ ] Testar tema Black OLED.
- [ ] Testar tema Claro.
