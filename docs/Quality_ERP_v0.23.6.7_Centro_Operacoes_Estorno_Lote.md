# Quality ERP v0.23.6.7 — Centro de Operações e Estorno em Lote

## Objetivo

Refinar os filtros rápidos e tornar o gerenciamento e o estorno de operações mais ágeis, preservando o fluxo individual já consolidado de reversão de estoque, Caixa e financeiro.

## Alterações

### Filtros rápidos

- Os links simples foram substituídos por um seletor compacto em formato de botões.
- Cada situação apresenta seu contador: Todas, Abertas, Concluídas, Canceladas e Estornadas.
- A situação ativa possui destaque visual nos temas Black OLED e Claro.

### Gerenciamento individual

- Imprimir, Duplicar, Cancelar ou Estornar ficam agrupados na mesma área.
- O botão Estornar permanece próximo das demais ações, evitando deslocamento horizontal do operador.
- Documento fiscal continua separado de forma discreta para futura integração fiscal.

### Seleção e estorno em lote

- Checkbox na extremidade direita de cada operação.
- Somente operações concluídas podem ser selecionadas.
- Checkbox no cabeçalho seleciona todas as operações concluídas visíveis no filtro atual.
- Ao selecionar uma ou mais operações, aparece uma barra com contador e ação `Estornar selecionadas`.
- O motivo informado é aplicado a todas as operações do lote.
- Cada operação utiliza individualmente a rota consolidada de estorno, mantendo as validações existentes de Caixa, estoque, títulos e financeiro.
- Falhas são apresentadas por número da operação; operações válidas já processadas não são ocultadas.

## Compatibilidade

- Nenhuma estrutura de dados foi alterada.
- Nenhuma lógica consolidada de estorno foi duplicada.
- O processamento em lote reutiliza a rota individual existente.
- Compatível com operações e históricos atuais.

## Arquivos alterados

- `views/centro_operacoes.ejs`
- `public/css/painel-theme.css`
- `docs/Quality_ERP_v0.23.6.7_Centro_Operacoes_Estorno_Lote.md`

## Testes recomendados

1. Alternar entre todos os filtros rápidos nos modos Black OLED e Claro.
2. Selecionar uma operação concluída pelo checkbox da direita.
3. Selecionar todas as operações concluídas visíveis pelo checkbox do cabeçalho.
4. Limpar a seleção pela barra de ações.
5. Estornar duas operações concluídas e verificar Caixa, estoque, financeiro e histórico.
6. Confirmar que operações abertas, canceladas e estornadas não podem ser marcadas.
7. Abrir `Gerenciar` e confirmar que Estornar fica próximo de Imprimir e Duplicar.
