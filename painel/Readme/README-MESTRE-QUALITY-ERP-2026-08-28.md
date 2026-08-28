# Quality ERP — Documentação Mestre Consolidada

**Data de consolidação:** 28/08/2026  
**Base revisada:** ZIP completo atual do Quality ERP + pacote de Precificação Inteligente 19 + changelogs existentes em `Readme/` + decisões e ajustes registrados ao longo das conversas disponíveis nesta sessão.

> **Regra deste documento:** itens são separados em **Implementado/Verificado**, **Parcial/Em refinamento** e **Planejado/Backlog**. Uma ideia discutida não deve ser interpretada como funcionalidade pronta.

---

## 1. Visão geral do produto

O **Quality ERP** é um ERP/Painel comercial próprio, construído para substituir progressivamente a dependência da WM10 e centralizar operação comercial, estoque, compras, financeiro, CRM/WhatsApp, loja virtual e gestão.

Princípios de produto registrados ao longo do desenvolvimento:

- fluxo real de trabalho antes de complexidade técnica;
- interface limpa e rápida;
- poucos cliques;
- evitar recarregamentos desnecessários;
- telas extensas devem usar agrupamento, recolhimento e filtros contextuais;
- dados operacionais devem possuir rastreabilidade;
- nomes técnicos internos não devem aparecer ao usuário quando existir nome humano disponível;
- alterações estruturais devem preservar histórico;
- relatórios devem ajudar decisão, e não apenas reproduzir listagens antigas da WM10;
- módulos devem ser desenhados para futura utilização por outras empresas.

---

# PARTE I — IMPLEMENTADO / PRESENTE NA BASE ATUAL

## 2. Clientes

### Cadastro e consulta
- cadastro de clientes;
- PF/PJ;
- CPF/CNPJ;
- consulta/validação de documento;
- e-mail, telefone e dados cadastrais;
- data de nascimento;
- endereço assistido;
- ficha do cliente;
- edição rápida a partir do PDV;
- busca por nome, documento, telefone, e-mail e outros identificadores;
- proteção contra duplicidade de CPF/CNPJ.

### Histórico WM10
Existe base histórica importada da WM10 e estrutura para consulta sem transformar informações antigas em novas vendas/financeiro.

### Análises de clientes
- clientes inativos / reativação;
- histórico de movimentações;
- diferenciação entre histórico WM10 e histórico ERP;
- rankings/visões de recorrência, quantidade e valor conforme a evolução dos relatórios.

---

## 3. Produtos, variações e cadastro comercial

### Cadastro
- produto/serviço;
- SKU/código;
- código de barras;
- categoria;
- marca;
- status ERP;
- status Loja Virtual;
- estoque;
- custos;
- preços;
- variações;
- galeria/descrição/SEO e informações comerciais.

### Variações
As variações são tratadas como entidades comerciais/estoque vinculadas ao produto. O sistema já possui preço de venda por variação.

### Custo por variação — Entrega 19
A Precificação Inteligente acrescenta independência de custo:

- variação pode possuir custo próprio;
- se não houver custo próprio, herda dinamicamente o custo do produto pai;
- compra vinculada à variação deve atualizar somente o custo daquela variação;
- variações irmãs não devem ser sobrescritas.

---

## 4. Precificação Inteligente — Entrega 19

### Hierarquia de regras
Prioridade:

1. **Variação**
2. **Produto**
3. **Categoria**
4. **Regra geral**

A regra mais específica substitui a genérica.

### Casos suportados
- uma categoria pode ter margem padrão;
- produtos dentro da mesma categoria podem ter margens diferentes;
- vários produtos selecionados podem receber determinada regra;
- uma variação pode ter regra distinta do produto e das demais variações;
- campo específico vazio volta a herdar a regra superior.

### Tela de precificação
Prevê/implementa:
- origem da regra efetiva;
- custo;
- preço atual;
- margem/acréscimo efetivo;
- preço sugerido;
- seleção dos preços que serão aplicados;
- arredondamento comercial.

### Segurança
Mudança de custo não deve alterar preço de venda cegamente. Fluxo:
**detectar → calcular → sugerir → revisar → aplicar**.

### Fórmula atual
A regra da Entrega 19 foi documentada como percentual sobre custo.

Exemplo: custo R$ 100 + 20% = preço calculado R$ 120.

---

## 5. Estoque

### Estoque operacional
- movimentações de entrada/saída/ajuste;
- saldo por produto/variação;
- auditoria de movimentos;
- integração com compras e vendas.

### Contagem de estoque
- contagem parcial;
- contagem total;
- busca por código/Enter;
- modo contínuo;
- busca em itens já contados;
- finalização segura;
- histórico de contagens;
- divergências e ajustes.

### Giro / estoque parado
Análises trabalham com:
- saldo;
- comprado;
- vendido;
- giro;
- cobertura;
- última venda;
- dias sem venda;
- capital em estoque.

Evoluções recentes:
- separar sem vendas / baixo giro / giro regular / alto giro / atípicos;
- blocos recolhíveis;
- excluir saldos operacionais absurdamente atípicos da leitura gerencial sem alterar o saldo físico;
- tentar resolver nomes reais de variações antes de mostrar IDs técnicos.

---

## 6. Compras

### Compras manuais e XML
- fornecedores;
- importação XML;
- vínculo seguro com fornecedor;
- cadastro de fornecedor durante o processo;
- vínculo de produtos;
- nome atual do produto vinculado;
- parcelas/vencimentos;
- classificação financeira;
- sugestão/triagem de produtos;
- custo e preço de venda durante entrada.

### Relatórios/análises de compra
- quantidade de compras;
- itens comprados;
- valor comprado;
- ticket médio;
- fornecedores utilizados;
- NF/XML;
- compras sem documento;
- compras por responsável;
- período com mais compras;
- produtos mais comprados;
- evolução do custo;
- comparação do mesmo produto/variação entre fornecedores.

### Leitura de preço
A análise deve diferenciar:
- **Onde paguei mais**
- **Onde comprei melhor**

A evolução prevista/implementada nas últimas rodadas inclui listas com múltiplos casos, e não somente um card.

### Data da compra para relatórios
- com NF/XML: preferir data fiscal/emissão;
- sem documento: usar data de cadastro da compra no ERP.

---

## 7. Fornecedores

- cadastro;
- PF/PJ;
- histórico de compras;
- integração com Compras/XML;
- busca;
- dados financeiros/cadastrais conforme telas existentes.

---

## 8. PDV / Venda

### Operação
- nova venda;
- cliente/consumidor final;
- itens;
- quantidade;
- preço;
- desconto;
- vendedor;
- múltiplas formas de pagamento;
- parcelas;
- total pago, pendente e troco;
- observações;
- impressão;
- salvamento em aberto;
- conclusão;
- estorno/cancelamento conforme permissões.

### Busca
- pesquisa de produto por nome, código, SKU e código de barras;
- atualização de catálogo sem depender de F5;
- seleção rápida de produto;
- atalhos de teclado.

### Cliente no PDV
- busca;
- cadastro rápido;
- edição;
- PF/PJ;
- validação de documento;
- CNPJ;
- proteção contra duplicidade.

### Descontos
- desconto em R$;
- desconto em %;
- limite individual por usuário/vendedor;
- autorização acima do limite;
- supervisor;
- chave temporária de desconto;
- auditoria das autorizações;
- cupons de desconto.

### Frete
Estrutura recente:
- frete/despesas no PDV;
- transportadora;
- seguro;
- outras despesas;
- volumes/pesos;
- impacto no total da operação.

---

## 9. Transportadoras

- cadastro de transportadoras/métodos;
- seleção no frete do PDV;
- CNPJ/CPF e dados cadastrais;
- consulta de CNPJ para autopreenchimento;
- prevenção de CNPJ duplicado;
- cadastro manual como fallback.

---

## 10. Ordem de Serviço (O.S.)

O PDV também opera em modo O.S., com:
- equipamento;
- identificação;
- técnico;
- problema informado/diagnóstico;
- serviço realizado;
- valores;
- comprovantes;
- vendedor/técnico ligados aos usuários configurados.

Comprovantes de entrada/saída foram refinados ao longo do projeto.

---

## 11. Caixa e Financeiro

### Caixa
- caixa operacional;
- abertura/fechamento;
- movimentações;
- suprimento/sangria;
- formas de pagamento;
- integração com vendas.

### Contas a Receber
- parcelas;
- recebimentos;
- crediário;
- baixa;
- integração com fluxo financeiro.

### Contas a Pagar
- contas/despesas;
- parcelas;
- vencimentos;
- pagamentos;
- alteração em massa;
- filtros;
- centro de custo;
- plano de contas;
- fornecedor;
- totais.

### Fluxo de Caixa
Módulo presente para acompanhar entradas, saídas e saldo.

### DRE
Módulo presente, com revisões para competência e contas a pagar.

### Recebimentos parcelados
A estrutura considera parcelamento conforme a forma de pagamento e datas reais de recebimento.

---

## 12. Crediário / Carnê / Comprovantes

- parcelas;
- impressão;
- configuração visual;
- dados da empresa;
- comprovantes de venda e O.S.;
- múltiplas formas de pagamento;
- valores sem quebra indevida;
- itens padronizados;
- parcelas futuras.

---

## 13. Agenda

### Uso operacional
- tarefas;
- compromissos;
- lembretes;
- responsáveis;
- prioridades;
- cliente opcional;
- vencidas/hoje/próximas/sem data/concluídas;
- filtros por responsável;
- integração visual com Dashboard/Painel Comercial.

### Refinamentos recentes
- campo de texto maior;
- edição de tarefa;
- auditoria de criação/edição/conclusão/exclusão;
- registro de quem alterou e antes/depois.

---

## 14. CRM / WhatsApp / Inbox

### Inbox
- lista de conversas;
- navegação;
- início de nova conversa;
- otimizações de performance;
- envio de blocos sem reload;
- armazenamento mais enxuto;
- atualização silenciosa.

### Blocos
- blocos prontos;
- UX recolhível;
- biblioteca/mídias;
- simulador.

### Automação
- palavras-chave;
- menus;
- ramificações;
- opções;
- resposta inválida;
- timeout;
- fluxo visual;
- persistência de estado.

### Agendamentos
- texto;
- imagem;
- áudio;
- compatibilidade OGG/OPUS/WEBM conforme evoluções;
- execução automática;
- listagem/limpeza.

### Aniversariantes
- automação;
- mensagem e horário;
- envio;
- reenvio de atraso;
- integração com clientes.

### Painel Comercial
- contatos do dia/semana/mês;
- oportunidades aguardando resposta;
- agenda/lembretes;
- interesses;
- contatos por dia;
- comparação mensal em evolução recente.

### Interesses
Evolução recente busca separar:
- produtos;
- serviços;
e considerar conteúdo de conversas, validando contra cadastros reais para reduzir falsos interesses.

---

## 15. Dashboard / Centro de Operações / Atalhos

- dashboard geral;
- Centro de Operações;
- cards;
- financeiro;
- faturamento;
- atenção necessária;
- mapa/localização de clientes;
- atalhos configuráveis;
- menu global;
- temas.

### Temas
- Claro;
- escuros;
- Dark Blue;
- Black OLED;
com ajustes progressivos de contraste e legibilidade.

---

## 16. Loja Virtual / Site

Estrutura presente:
- produtos;
- categorias;
- subcategorias;
- SEO;
- marcas;
- banners;
- páginas;
- cabeçalho;
- rodapé;
- personalização;
- manutenção;
- publicação;
- preview;
- Analytics;
- Marketing.

### Integração ERP x Loja
Produtos possuem estados/atributos distintos de ERP e Loja Virtual.

---

## 17. Marketing

Existe módulo de Marketing/Marketing IA documentado no ZIP, com:
- histórico;
- referências;
- evolução por versões;
- estrutura própria de dados.

---

## 18. Relatórios

### Central de Relatórios
Estrutura consolidada em uma única central.

Visões trabalhadas:
- Resumo;
- Lucratividade;
- Produtos mais vendidos;
- Giro / Estoque parado;
- Vendedores;
- Descontos;
- Vendas detalhadas;
- Formas de pagamento;
- Compras;
- Despesas;
- Clientes / Reativação;
- Contagens;
- Auditoria;
- Saúde financeira (evolução recente).

### Diretrizes de UX
- filtros somente quando aplicáveis;
- ícone de informação;
- cores semânticas;
- tabelas com leitura facilitada;
- blocos recolhíveis;
- evitar rolagens internas duplicadas;
- CSV;
- impressão/PDF.

---

## 19. Produtos mais vendidos

- ranking por quantidade;
- opções de ordenação por outros indicadores conforme tela;
- separação:
  - geral;
  - produtos;
  - serviços.

---

## 20. Despesas

Objetivo gerencial:
- entender para onde o dinheiro vai;
- centro de custo;
- plano de contas;
- pago;
- em aberto;
- saídas efetivas;
- maiores despesas;
- participação por grupo.

A semântica visual deve usar vermelho para concentração de gastos/problemas.

---

## 21. Clientes / Reativação / Recorrência

Visões discutidas e evoluídas:
- reativação quente;
- atenção;
- inatividade antiga;
- nunca comprou;
- mais retornam;
- mais itens;
- maior valor;
- janelas de 30 dias, 3/6/9/12 meses e todo histórico;
- ordenação por recentes/antigos/valor/recorrência.

---

## 22. Auditoria

### Objetivo
Responder:
- quem fez;
- o quê;
- quando;
- onde;
- resultado;
- antes/depois quando possível.

### Áreas
- alterações detalhadas;
- auditoria operacional;
- movimentações de estoque;
- erros;
- usuários/atores.

### Evolução
As áreas devem iniciar recolhidas para reduzir poluição visual.

---

## 23. Usuários, perfis, login e permissões

### Usuários
- nome;
- nome operacional/PDV;
- usuário;
- e-mail;
- senha protegida;
- perfil;
- vendedor;
- técnico;
- ativo/inativo.

### Login
- autenticação;
- sessão;
- botão de sair;
- expiração por inatividade;
- proteção de rotas no servidor.

### Permissões
Cobertura granular sobre:
- ERP;
- PDV;
- descontos;
- cancelamentos;
- clientes;
- produtos;
- estoque;
- compras;
- fornecedores;
- financeiro;
- relatórios;
- metas/comissões;
- CRM;
- WhatsApp;
- Site;
- Marketing;
- Ferramentas;
- Configurações;
- usuários;
- auditoria.

### Restrições
- data limite;
- dias/horários;
- IP.

### Recuperação
Existe evolução de recuperação de acesso, com e-mail e chave de recuperação. A proposta de confirmação por celular + e-mail permanece uma evolução que depende de canais reais de envio.

---

## 24. Metas e Comissões

### Metas
- loja;
- vendedor;
- mensal/semanal;
- atingido;
- falta;
- progresso;
- projeção;
- necessidade por dia.

### Comissão
- próprias vendas;
- loja inteira;
- próprias vendas condicionadas à meta da loja;
- base em venda concluída;
- base em financeiro recebido;
- valor fixo ou percentual;
- faixas progressivas;
- categorias;
- detalhamento por venda/item;
- fechamento;
- congelamento do período;
- lançamento em Contas a Pagar;
- proteção contra duplicidade.

---

## 25. Histórico WM10

Existe pasta histórica organizada no ERP com dados antigos separados.

Objetivo:
- consulta;
- comparação;
- relatórios históricos;
- não contaminar estoque/financeiro operacional novo.

Uso nos relatórios foi orientado principalmente para:
- faturamento;
- lucratividade;
- comparações mensais.

A origem deve ser identificada como histórico/importação WM10.

---

# PARTE II — PARCIAL / EM REFINAMENTO

## 26. Saúde financeira

Conceito gerencial em evolução.

Pode combinar:
- faturamento;
- lucro/margem;
- despesas;
- caixa;
- contas a pagar;
- contas a receber;
- inadimplência;
- estoque parado;
- concentração de gastos;
- tendência.

Não substitui a contabilidade formal. Serve como diagnóstico operacional/gerencial.

---

## 27. Recuperação multifator de acesso

Desejo registrado:
1. recuperação de usuário/senha;
2. celular com DDD;
3. código por celular;
4. confirmação por e-mail;
5. alternativa segura caso o número seja perdido.

A implementação completa depende de provedor/canal real de e-mail e SMS/WhatsApp.

---

## 28. Relatórios e inteligência comercial

Continuam em refinamento:
- filtros contextuais;
- comparações;
- leitura de compras;
- clientes;
- giro;
- saúde financeira;
- auditoria;
- indicadores do Painel Comercial.

---

## 28.1 Trocas e Devoluções no PDV — Entrega 20

Implementado para vendas finalizadas:
- localização da venda original;
- seleção de item/quantidade com controle do que já retornou;
- motivo e descrição obrigatórios;
- destino físico: estoque vendável, quarentena/problema ou descarte;
- motivos de defeito/garantia/avaria não podem voltar diretamente ao estoque vendável;
- crédito calculado pelo valor líquido efetivamente pago no item, com rateio de cupom/desconto;
- primeiro abate Contas a Receber ainda abertas da venda;
- saldo restante entra na carteira do cliente;
- nova forma de pagamento “Crédito do cliente / troca” permite usar a carteira em uma nova venda;
- se a nova venda for maior, o cliente paga a diferença; se for menor, o saldo permanece na carteira;
- auditoria, vínculo com venda original e histórico;
- relatório de Trocas/Devoluções com produtos, motivos, taxa de retorno e associação indicativa com fornecedor.

Limites desta etapa: não realiza reembolso direto em dinheiro/cartão e ainda não inclui O.S.; itens em quarentena ficam fora do estoque vendável e são acompanhados pelo registro da devolução.

---

# PARTE III — PLANEJADO / BACKLOG

## 30. Solicitação de Compra

Planejada como fluxo leve:
- solicitante automático;
- departamento;
- urgência;
- item cadastrado ou manual;
- quantidade;
- custo estimado;
- frete;
- local/fornecedor;
- link;
- observações;
- data necessária.

Fluxo proposto:
**Aberta → Em análise → Aprovada → Em compra → Concluída**
+ cancelamento e histórico.

Não deve movimentar estoque/financeiro apenas por existir.

---

## 31. Pré-venda Mobile

Planejada para agilizar atendimento pelo celular:
- mini-PDV responsivo;
- cliente;
- produtos;
- carrinho;
- vendedor logado;
- envio para finalização no PDV.

---

## 32. Carrinho compartilhável

Planejado:
- gerar link;
- cliente visualizar seleção;
- eventualmente adicionar/remover itens;
- retornar seleção à loja;
- ferramenta de venda assistida, não necessariamente checkout completo.

---

## 33. Kanban configurável

Planejado para:
- pré-vendas;
- O.S.;
- vendas aguardando retirada;
- CRM;
- processos personalizados.

Colunas devem ser configuráveis.

---

## 34. Portal do Contador / Arquivos Fiscais

Planejado:
- perfil/acesso do contador;
- área fiscal isolada;
- arquivos mensais;
- NF-e entrada/saída;
- devoluções;
- NFC-e;
- NFS-e;
- histórico de geração;
- auditoria de acesso/download pelo contador.

---

## 35. Fiscal próprio / integração fiscal

O ERP ainda possui decisão estratégica pendente sobre:
- emissão fiscal própria;
- integração temporária com WM10/outro emissor;
- NF-e/NFC-e/NFS-e.

Relatórios fiscais completos devem acompanhar essa definição.

---

## 36. Multiempresa / comercialização do ERP

Backlog estratégico:
- habilitar/desabilitar módulos;
- vender módulos em partes;
- personalização por empresa;
- permissões e perfis;
- configurações independentes;
- preparar white-label/multiempresa.

---

## 37. Multi-idioma

Planejado:
- português;
- inglês;
- outros idiomas futuramente.

---

## 38. Relógio-ponto

Módulo citado como futuro, ainda não implementado.

---

# PARTE IV — REGRAS TRANSVERSAIS E INVARIANTES

## 39. Histórico não pode ser reescrito por mudanças atuais
Alterar nome/categoria/preço de um produto não deve apagar a rastreabilidade da operação histórica.

Relatórios podem mostrar o nome atual quando isso melhora a leitura, mas dados financeiros históricos devem preservar custo/valor efetivamente registrado na época quando necessário.

---

## 40. Usuário logado é o ator
Ações novas devem registrar usuário real, não “painel”, sempre que a autenticação estiver disponível.

Registros antigos sem usuário real não devem ser falsamente atribuídos a alguém.

---

## 41. IDs técnicos não são UX
`VAR-...`, IDs internos e códigos de storage podem existir internamente, mas a interface deve priorizar:
- nome do produto;
- atributos da variação;
- código comercial;
- contexto humano.

---

## 42. Permissão deve existir no backend
Esconder menu/botão não é segurança. A rota/ação deve ser protegida no servidor.

---

## 43. Alterações de preço exigem revisão
Mudança de custo pode gerar alerta/sugestão, mas não deve alterar preço automaticamente sem uma regra explícita e processo de aprovação.

---

## 44. Relatório não deve duplicar módulo operacional
Sempre que possível, várias visões analíticas relacionadas devem compartilhar uma única base, filtros e drill-down, em vez de reproduzir dezenas de relatórios isolados da WM10.

---

# PARTE V — PREFERÊNCIAS DE UX REGISTRADAS

## 45. Interface
- compacta;
- alinhada;
- sem excesso de espaço em branco;
- sem colunas desnecessariamente largas;
- responsiva;
- sem recarregar página quando não for necessário.

## 46. Pesquisa
Em vários fluxos foi preferido pesquisar com **Enter ou botão**, evitando disparar busca no meio da digitação quando isso atrapalha a operação.

## 47. Tabelas
- paginação adequada;
- colunas configuráveis quando necessário;
- linhas com contraste sutil;
- status legível;
- somatórios claros.

## 48. Entregas de código
Preferência operacional registrada: entregar **somente os arquivos novos/alterados em ZIP**, e não o pacote completo, salvo quando solicitado.

---

# PARTE VI — INVENTÁRIO DA BASE ATUAL

## 49. Views relevantes verificadas no ZIP completo

Foram encontradas telas para, entre outras:
- Agenda
- Analytics
- Automação WhatsApp
- Banners
- Caixa
- Categorias
- Centro de Operações
- Clientes
- Compras
- Configurações
- Contas a Pagar
- Contas a Receber
- DRE
- Estoque
- Contagens
- Fluxo de Caixa
- Fornecedores
- Login
- Marketing
- Metas e Comissões
- Orçamentos
- PDV
- Produtos
- Recuperação de acesso
- Relatórios
- SEO
- Loja/Site
- Sorteios

## 50. Serviços relevantes verificados
A base atual contém serviços dedicados para áreas como:
- autenticação;
- transportadoras;
- fluxo de caixa;
- comércio;
- comissões;
- consulta empresarial;
- cupons;
- clientes;
- carteira/crédito;
- dashboard;
- autorização de desconto;
- DRE;
- histórico ERP;
- agenda/tarefas;
- financeiro;
- estoque;
- contas a pagar;
- compras;
- contas a receber;
- relatórios;
- contagem;
- fornecedores;
- usuários;
- WhatsApp Inbox;
- importações WM10.

A Entrega 19 adiciona/atualiza o serviço de precificação.

---

# PARTE VII — POLÍTICA DE DOCUMENTAÇÃO

## 51. A partir desta consolidação
Cada entrega relevante deve incluir no `Readme/`:

1. objetivo;
2. problema anterior;
3. arquivos alterados/novos;
4. regra de negócio;
5. comportamento esperado;
6. impactos em estoque/financeiro;
7. impactos de permissão/auditoria;
8. validações executadas;
9. itens pendentes;
10. distinção explícita entre implementado e planejado.

O `README-MESTRE-QUALITY-ERP.md` deve ser atualizado quando surgir:
- novo módulo;
- nova regra estrutural;
- mudança de arquitetura;
- funcionalidade que afete mais de um módulo;
- nova pendência estratégica.
