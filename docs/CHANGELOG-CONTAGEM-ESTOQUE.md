# Quality ERP — Contagem e Ajuste de Estoque v0.27.2

## Ajustes desta entrega

- A lista **Produtos para contagem** foi movida para baixo de **Produtos contados**.
- **Produtos para contagem** agora inicia recolhida e só carrega o catálogo quando o usuário abrir a seção.
- Ao abrir uma contagem já concluída ou cancelada pelo histórico, a tela mostra somente os produtos que efetivamente fizeram parte da contagem; o catálogo geral não é exibido.
- Na listagem principal de **Estoque**, foi adicionado controle de 50, 100, 200 ou 300 produtos por página, com navegação Anterior/Próxima e filtros preservados.
- O texto de apoio da tela Estoque foi movido para um ícone informativo `i`.
- Removido o selo **Movimentações inteligentes · v0.11.9** da lista operacional de estoque.
- O texto de apoio da tela **Contagens de estoque** foi movido para um ícone informativo `i`.
- A orientação sobre **Contagem parcial x total** recebeu maior destaque visual.
- A explicação de **Bloquear vendas no PDV durante a contagem** passou a ficar em uma linha separada.
- Contagens de estoque com status **Em andamento** agora aparecem na Dashboard em **ATENÇÃO NECESSÁRIA / O que pede ação**, com acesso para a tela de contagens.

## Observação de desempenho

A listagem principal continua usando os dados já carregados pela rota atual, mas somente a quantidade selecionada é exibida por página. Na tela de contagem, o catálogo geral é carregado sob demanda somente quando a seção recolhida é aberta.
