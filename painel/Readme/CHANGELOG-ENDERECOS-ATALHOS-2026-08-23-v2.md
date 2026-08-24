# Quality ERP — Endereços e atalhos do menu (23/08/2026)

## Endereços
- Sugestões passam a considerar o CEP informado.
- Quando o CEP é específico de um logradouro, o ERP não sugere endereços de outro CEP.
- Quando o CEP é geral da cidade (caso comum em cidades menores), o ERP pode complementar a busca com nomes de vias do OpenStreetMap, mantendo o CEP informado e restringindo a cidade/UF.
- Sem CEP, é possível começar pelo campo Endereço; as sugestões exibem cidade/UF para evitar ambiguidade e, ao selecionar uma opção, o ERP pode preencher cidade, UF e CEP disponíveis.
- Busca continua com debounce e cache para não pesar o cadastro.

## Atalhos do menu
- "Personalizar atalhos" do menu global deixou de abrir a personalização da Dashboard.
- Criada personalização independente dos atalhos do menu superior.
- Preferência é salva localmente no navegador, sem alterar os atalhos rápidos da página inicial.
- Opções disponíveis: PDV, Caixa Operacional, Agenda, Inbox, Centro de Operações, Clientes, Compras e Estoque.
- Incluído botão para restaurar o padrão.
