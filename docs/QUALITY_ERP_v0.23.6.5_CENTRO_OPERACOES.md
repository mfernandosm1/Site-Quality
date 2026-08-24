# Quality ERP v0.23.6.5 — Refinamento do Centro de Operações

## Objetivo
Corrigir a quebra visual causada pela expansão das ações do botão **Gerenciar** dentro da célula da tabela.

## Alterações
- O menu interno da célula foi substituído por um painel expansível em uma linha própria, logo abaixo da operação selecionada.
- Apenas um painel de gerenciamento permanece aberto por vez.
- A tecla `Esc` fecha o painel ativo.
- Ações agrupadas em ações operacionais, cancelamento/estorno e documento fiscal.
- Botões com ícones, títulos informativos e alinhamento consistente.
- Preservadas todas as rotas e regras existentes.
- Ajustes específicos para Black OLED, modo Claro e telas menores.

## Arquivos alterados
- `views/centro_operacoes.ejs`
- `public/css/painel-theme.css`

## Compatibilidade
Nenhuma estrutura de dados, rota ou serviço foi alterado. A mudança é exclusivamente visual e comportamental.
