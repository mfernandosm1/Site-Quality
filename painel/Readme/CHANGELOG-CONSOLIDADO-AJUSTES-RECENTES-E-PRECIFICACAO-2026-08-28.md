# Quality ERP --- Documentação consolidada dos ajustes recentes

**Data:** 28/08/2026\
**Escopo:** ajustes realizados nas etapas recentes da conversa, com foco
em Relatórios, Segurança/Usuários, Agenda, Compras, PDV, Configurações e
Precificação Inteligente.

> Este documento separa o que já foi entregue/implementado do que foi
> discutido como evolução futura, para evitar que uma ideia de backlog
> seja confundida com funcionalidade pronta.

------------------------------------------------------------------------

## 1. Precificação Inteligente --- Entrega 19

### Objetivo

Eliminar a limitação de trabalhar apenas com uma margem genérica por
categoria e permitir regras específicas sem conflito entre categoria,
produto e variação.

### Hierarquia de regras

A prioridade adotada é:

1.  **Variação**
2.  **Produto**
3.  **Categoria**
4.  **Regra geral**

A regra mais específica substitui a mais genérica.

### Exemplo

-   Categoria Fones: margem padrão de 30%
-   Produto X, dentro de Fones: margem própria de 20%
-   Produto Y, dentro de Fones: margem própria de 45%
-   Produto Z, sem regra própria: herda 30% da categoria
-   Produto X / Preto: margem específica de 10%
-   Produto X / Azul: margem específica de 20%

Assim, produtos da mesma categoria não precisam usar a mesma margem e
variações do mesmo produto também podem ter margens diferentes.

### Tela de Precificação

A estrutura permite: - margem geral; - margem por categoria; - margem
específica por produto; - aplicação de margem em vários produtos
selecionados; - margem específica por variação; - herança automática
quando uma regra específica estiver vazia; - indicação visual da origem
da regra efetiva; - visualização de custo, preço atual, margem efetiva e
preço sugerido; - seleção dos preços sugeridos que realmente serão
aplicados; - opções de arredondamento comercial.

### Segurança da alteração

O sistema não deve alterar preços automaticamente apenas porque o custo
mudou. A proposta é: 1. calcular; 2. sugerir; 3. mostrar impacto; 4.
permitir revisão; 5. aplicar somente após decisão do usuário.

### Fórmula desta etapa

A regra desta entrega foi tratada como **acréscimo/margem alvo sobre
custo**.

Exemplo: - custo: R\$ 100,00 - regra: 20% - preço calculado: R\$ 120,00

Uma futura modalidade de margem bruta calculada sobre o preço de venda
deve ser tratada como método separado para não gerar ambiguidade.

------------------------------------------------------------------------

## 2. Custo de compra por variação

### Problema anterior

O produto já permitia preços de venda diferentes por variação, porém o
custo de compra não possuía a mesma independência.

### Comportamento definido

Cada variação pode possuir seu próprio custo.

Exemplo:

  Variação           Custo       Venda   Regra
  -------------- --------- ----------- -------
  Preto 128 GB     R\$ 700     R\$ 999     20%
  Azul 128 GB      R\$ 750   R\$ 1.049     25%
  Preto 256 GB     R\$ 850   R\$ 1.199     30%

### Herança

-   Se a variação possuir custo próprio, utiliza esse custo.
-   Se o custo da variação estiver vazio, herda dinamicamente o custo do
    produto pai.
-   Uma compra vinculada a uma variação deve atualizar o custo daquela
    variação sem sobrescrever as demais.

Isso permite combinar corretamente **custo próprio + preço de venda
próprio + margem própria**.

------------------------------------------------------------------------

## 3. Compras e análise de fornecedores

Os relatórios de compras foram aprofundados para deixar de mostrar
apenas totais e passar a apoiar decisão de compra.

### Indicadores trabalhados

-   quantidade de compras;
-   itens comprados;
-   valor comprado;
-   ticket médio;
-   fornecedores utilizados;
-   compras com NF/XML;
-   responsável que mais comprou;
-   período com mais compras;
-   comparação de fornecedores para o mesmo produto/variação;
-   evolução do custo;
-   produtos mais comprados.

### Comparação de preço

A leitura deve mostrar tanto: - **onde comprei melhor**; - **onde paguei
mais caro**.

A intenção é não apresentar apenas uma "economia teórica", mas permitir
enxergar acertos e perdas de compra.

### Listagens

A evolução definida é permitir mais de um item nas análises "Onde
comprei melhor" e "Onde paguei mais", em vez de depender somente de um
card isolado.

### Datas

Quando houver documento fiscal/XML, a análise de período deve priorizar
a data fiscal. Quando não houver, pode usar a data de cadastramento da
compra no ERP.

------------------------------------------------------------------------

## 4. Relatórios --- filtros e experiência de uso

Foi identificado que alguns filtros da Central de Relatórios são
específicos de determinados relatórios e não fazem sentido globalmente.

### Diretriz adotada

-   mostrar apenas filtros aplicáveis à visão atual;
-   utilizar ícone de informação para explicar filtros menos óbvios;
-   evitar que "Top", "Ordenar produtos por", "Sem giro a partir de"
    etc. pareçam filtros universais;
-   reduzir barras de rolagem internas desnecessárias;
-   preferir blocos recolhíveis/expansíveis para relatórios extensos;
-   usar cores com significado operacional e financeiro.

### Cores

Exemplos de semântica: - vermelho: problema, perda, despesa crítica,
erro; - verde: resultado positivo/economia/lucro; - azul:
informação/valor neutro; - amarelo/laranja: atenção.

------------------------------------------------------------------------

## 5. Relatório de Despesas

O relatório passou a ser tratado como ferramenta de gestão, não apenas
listagem de contas.

### Objetivo

Responder rapidamente: - para onde o dinheiro está indo; - quais centros
de custo pesam mais; - quais contas pesam mais; - quanto já foi pago; -
quanto permanece em aberto; - quais gastos podem merecer revisão/corte.

### Indicadores

-   despesas do período;
-   pago dessas despesas;
-   saídas efetivamente pagas;
-   saldo em aberto;
-   maior centro de custo;
-   maior conta/plano de contas.

A apresentação de **Maior conta** deve utilizar semântica negativa,
preferencialmente vermelha, por representar concentração de gasto.

### Visualização

Blocos extensos devem ser recolhíveis para evitar múltiplas barras de
rolagem.

------------------------------------------------------------------------

## 6. Clientes / Reativação

A visão foi ampliada para não tratar todos os clientes sem compra como
um único grupo.

### Conceitos

É importante separar: - cliente que está começando a se afastar; -
cliente que está há algum tempo sem retornar; - cliente efetivamente
inativo há muito tempo; - cliente nunca comprador; - cliente recorrente.

### Filtros desejados/trabalhados

-   janela de análise;
-   período desde a última compra;
-   mais recentes sem comprar;
-   mais antigos sem comprar;
-   clientes que mais retornam;
-   clientes com mais compras;
-   clientes com maior valor histórico;
-   comparação em janelas como 3, 6, 9, 12 meses ou todo o período.

O histórico importado da WM10 pode ser usado como informação
histórica/analítica, sem criar movimentações novas no ERP.

------------------------------------------------------------------------

## 7. Giro / Estoque parado

### Problema de identificação

Foi encontrado item exibido como: `Item VAR-1786327668550-1`

Esse tipo de identificador técnico não é útil para o usuário.

A estratégia é resolver o nome da variação utilizando cadastro atual e
fontes históricas disponíveis antes de exibir um código técnico.

### Visões operacionais

A organização definida é separar em blocos como: - **Sem vendas no
período** - **Baixo giro** - **Alto giro**

Blocos extensos devem abrir/recolher, reduzindo rolagens internas.

### Indicadores

O relatório trabalha com estoque, compras, vendas, giro, cobertura,
última venda, dias sem venda e capital imobilizado.

O card de estoque deve deixar claro que representa a **quantidade física
controlada**, e não quantidade de SKUs/produtos cadastrados.

------------------------------------------------------------------------

## 8. Produtos mais vendidos

A visão foi refinada para permitir análise separada de: - geral; -
produtos; - serviços.

Isso evita que serviços recorrentes distorçam a leitura dos produtos
físicos mais vendidos.

------------------------------------------------------------------------

## 9. Auditoria

A auditoria foi evoluída para ser mais detalhada e útil para
rastreabilidade.

### Diretrizes

-   registrar usuário/ator;
-   data e hora;
-   módulo;
-   ação;
-   registro afetado;
-   resultado;
-   quando possível, antes/depois;
-   motivo quando aplicável.

As informações detalhadas devem iniciar recolhidas e serem abertas sob
demanda, evitando poluição visual e barras de rolagem duplicadas.

------------------------------------------------------------------------

## 10. Usuários, sessão e responsabilidade

O ERP deve utilizar o usuário autenticado como responsável pelas ações,
em vez de textos genéricos como "painel".

Isso se aplica progressivamente a: - compras; - alterações; - agenda; -
estoque; - financeiro; - auditoria; - aprovações; - demais operações
rastreáveis.

### Sessão

Foi definida a necessidade de expiração automática após período de
inatividade, como medida de segurança.

### Recuperação de acesso

Também foi discutida uma recuperação mais segura usando múltiplos
fatores, como e-mail e celular, além de alternativa de recuperação
quando o usuário não tiver mais acesso ao número cadastrado.

**Observação:** esta parte de recuperação multifator deve ser
considerada evolução de segurança e não confundida com a entrega de
Precificação 19.

------------------------------------------------------------------------

## 11. Agenda

A Agenda é tratada como ferramenta diária de operação.

### Melhorias definidas

-   remover limitação inadequada de caracteres em "O que precisa ser
    feito?";
-   permitir textos maiores;
-   permitir editar tarefa existente;
-   registrar quem alterou;
-   registrar data/hora;
-   registrar o que mudou;
-   preservar rastreabilidade na auditoria.

Também foi solicitada uma refinada geral na experiência de uso sem
perder a simplicidade atual.

------------------------------------------------------------------------

## 12. Configurações e descontos do PDV

### Navegação

A configuração foi reposicionada conceitualmente para um ícone de
engrenagem próximo ao usuário logado, em vez de ficar escondida dentro
do menu Negócio.

### Descontos

A organização definida coloca: 1. **Chave temporária de desconto** 2.
**Descontos e cupons**

A chave temporária funciona como autorização excepcional para
ultrapassar limites de desconto.

### PDV

Foi solicitada/estruturada a possibilidade de trabalhar desconto: - em
R\$; - em %.

Também foi levantada a necessidade de frete no PDV com transportadoras
previamente cadastradas.

------------------------------------------------------------------------

## 13. Transportadoras

A estrutura discutida prevê cadastro de transportadoras e métodos de
entrega para posterior seleção no frete do PDV.

Foi considerada também a consulta de dados empresariais a partir do CNPJ
para reduzir digitação manual.

------------------------------------------------------------------------

## 14. Histórico WM10 nos relatórios

Como existe base histórica importada da WM10, foi definida uma regra
importante:

Os dados históricos podem aparecer para **consulta e comparação**, mas
não devem criar movimentações retroativas nem interferir nos saldos
operacionais atuais do ERP.

O foco solicitado para histórico é: - faturamento; - lucratividade; -
comparação mensal.

Não é prioridade importar para essa visão: - comissões; - vendedores; -
ranking de produtos; - formas de pagamento; - outros detalhamentos não
solicitados.

A origem deve aparecer identificada como **Histórico WM10 / informação
importada**.

------------------------------------------------------------------------

## 15. Painel Comercial / WhatsApp

### Contatos por dia

A informação de contatos diários foi considerada útil e deve evoluir
para permitir: - filtro por período/mês; - comparação entre meses; -
percepção de aumento ou queda de procura.

### Interesses frequentes

A evolução desejada é não depender apenas de interações vindas do site.

O sistema poderá futuramente extrair possíveis interesses das conversas,
validar se o termo realmente corresponde a produto/serviço e separar: -
interesses em produtos; - interesses em serviços.

Essa evolução exige cuidado para não transformar qualquer frase da
conversa em interesse comercial falso.

------------------------------------------------------------------------

## 16. Saúde financeira

Foi discutida a possibilidade de o ERP oferecer uma leitura gerencial de
saúde financeira.

A proposta não é substituir a contabilidade, mas transformar dados
operacionais do ERP em indicadores de gestão, como: - geração de
caixa; - despesas/faturamento; - margem; - capital parado em estoque; -
contas a receber; - contas a pagar; - inadimplência; - evolução do
resultado; - concentração de despesas; - tendência mensal.

A contabilidade continua tendo papel fiscal, contábil e legal; o ERP
pode oferecer uma camada gerencial para decisões do dia a dia.

------------------------------------------------------------------------

## 17. Trocas / Devoluções --- evolução planejada

Foi discutida uma estrutura completa para trocas e devoluções no PDV.

### Regras levantadas

-   localizar a venda original;
-   selecionar item e quantidade;
-   motivo obrigatório;
-   impedir devolução duplicada da mesma quantidade;
-   decidir se o item retorna ao estoque vendável;
-   itens com defeito/garantia/avaria exigem tratamento cuidadoso;
-   registrar usuário responsável;
-   refletir corretamente entradas/saídas de estoque;
-   tratar diferença financeira quando o novo produto for mais caro ou
    mais barato;
-   preservar auditoria.

Também foi proposta uma análise de: - produtos com mais trocas; -
produtos com mais defeitos; - motivos mais frequentes; - possíveis
problemas recorrentes.

**Status documental:** conceito e arquitetura discutidos; não deve ser
considerado parte concluída da Entrega 19 de Precificação.

------------------------------------------------------------------------

## 18. Solicitação de Compra --- evolução planejada

Foi recuperada a ideia existente na WM10, mas com proposta de fluxo mais
simples.

Campos/conceitos previstos: - solicitante automático; - departamento; -
urgência; - produto cadastrado ou descrição manual; - quantidade; -
custo estimado; - frete; - local/fornecedor sugerido; - link; -
observação; - data de necessidade.

Fluxo proposto: **Aberta → Em análise → Aprovada → Em compra →
Concluída**, com possibilidade de cancelamento e histórico.

A solicitação não deve movimentar estoque ou financeiro sozinha.

**Status documental:** evolução planejada; não faz parte da Entrega 19
de Precificação.

------------------------------------------------------------------------

## 19. Próximas evoluções naturais

A partir da estrutura atual, as próximas etapas mais coerentes são:

1.  concluir e validar Trocas/Devoluções;
2.  relatório de produtos/problemáticas/devoluções;
3.  Solicitação de Compra;
4.  ampliar reajuste de preços em massa com simulação;
5.  alertas de alteração de custo após XML/compra;
6.  saúde financeira gerencial;
7.  continuar refinando relatórios e auditoria;
8.  recuperação segura de acesso.

------------------------------------------------------------------------

## 20. Arquivos da Entrega 19

A entrega de Precificação Inteligente contém alterações nos seguintes
arquivos:

-   `routes/erp.js`
-   `routes/produtos.js`
-   `services/pricing-service.js`
-   `services/purchase-service.js`
-   `services/auth-service.js`
-   `views/produtos.ejs`
-   `views/precificacao.ejs`
-   `views/compras.ejs`
-   `views/layout.ejs`

Esta documentação foi adicionada posteriormente para registrar
formalmente a etapa.

------------------------------------------------------------------------

## 21. Regra de documentação daqui para frente

Para evitar perda de contexto, cada entrega relevante deve registrar: -
objetivo; - problema anterior; - comportamento novo; - regras de
negócio; - impacto em estoque/financeiro quando houver; - auditoria; -
arquivos alterados; - pendências; - itens apenas planejados, claramente
separados dos concluídos.

Isso facilita manutenção futura e também prepara o Quality ERP para
implantação em outras empresas.
