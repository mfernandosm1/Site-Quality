# QUALITY ERP — LIÇÕES APRENDIDAS E ERROS QUE NÃO DEVEM SER REPETIDOS

Este documento reúne problemas que já aconteceram durante o desenvolvimento do Quality ERP. O objetivo não é apontar culpados, mas evitar que um novo desenvolvedor ou IA repita os mesmos erros.

Leia este documento antes de alterar qualquer módulo.

---

## 1. NÃO DIZER QUE ANALISOU O PROJETO SEM REALMENTE ANALISAR

Um dos erros mais graves é afirmar que:

- o ZIP foi completamente inspecionado;
- determinada quantidade de arquivos foi encontrada;
- as dependências foram mapeadas;
- uma documentação foi gerada do código;

sem ter realmente concluído essa análise.

Nunca inventar números, estruturas, nomes de arquivos ou relações entre módulos.

Quando algo ainda não foi confirmado, escrever claramente:

> “Esta informação ainda precisa ser confirmada diretamente no código.”

No Quality ERP, documentação errada é pior do que documentação incompleta, porque pode orientar outra pessoa a alterar o arquivo errado.

---

## 2. NÃO GERAR DOCUMENTAÇÃO GENÉRICA E CHAMAR DE MAPA TÉCNICO

Um verdadeiro Mapa Técnico precisa ser produzido a partir do código real.

Ele deve confirmar:

- quais rotas existem;
- quais services são importados;
- quais views são renderizadas;
- quais arquivos JSON são lidos;
- quais arquivos JSON são gravados;
- quais scripts do navegador chamam cada endpoint;
- quais módulos compartilham dados;
- quais funções são reutilizadas;
- quais arquivos concentram riscos.

Um documento com apenas:

```text
Routes → Services → JSON → Views
```

é uma visão arquitetural geral, não um Mapa Técnico completo.

Nunca apresentar uma estrutura-base como se fosse uma análise integral do sistema.

---

## 3. NÃO ALTERAR O PRIMEIRO ARQUIVO QUE PARECER RELACIONADO AO PROBLEMA

Já aconteceu de uma correção não produzir efeito porque o arquivo alterado não era o responsável pela tela exibida.

Antes de editar, localizar:

1. A rota acessada pelo navegador.
2. A rota Express responsável.
3. A view realmente renderizada.
4. Os partials incluídos pela view.
5. O JavaScript que altera a tela depois do carregamento.
6. O CSS responsável pela aparência.
7. Possíveis versões duplicadas da mesma tela.

Exemplo de problema já ocorrido:

Os cards de Produtos continuavam aparecendo no cadastro mesmo após várias alterações. Isso indicava que:

- o bloco podia estar vindo de outro partial;
- o JavaScript podia recriar os cards;
- havia uma condição de workspace incorreta;
- ou o arquivo editado não era o realmente usado.

Nunca insistir várias vezes no mesmo arquivo sem refazer o rastreamento completo.

---

## 4. NÃO CORRIGIR APENAS O HTML INICIAL QUANDO O JAVASCRIPT RECRIA A INTERFACE

No Quality ERP, várias telas são alteradas depois do carregamento.

Por isso, remover algo do EJS pode não ser suficiente quando:

- o JavaScript monta novamente o bloco;
- uma chamada `fetch` atualiza a área;
- um filtro muda o estado da tela;
- o navegador restaura o conteúdo;
- o workspace é interpretado novamente;
- há cache no cliente.

Sempre verificar:

- EJS;
- JavaScript inline;
- arquivos em `public/js`;
- funções de renderização;
- respostas de endpoints;
- eventos de filtro;
- carregamento assíncrono.

---

## 5. NÃO CONFUNDIR CACHE COM CORREÇÃO REAL

Já houve situações em que:

- após `Ctrl + F5`, a tela parecia correta;
- depois os elementos reapareciam;
- o comportamento mudava entre recarregamentos.

Isso normalmente significa que a correção não estava completa.

Antes de considerar resolvido:

1. Reiniciar o servidor.
2. Abrir a tela em nova aba.
3. Atualizar normalmente.
4. Atualizar com `Ctrl + F5`.
5. Navegar para outra tela e voltar.
6. Alterar filtros ou workspace.
7. Testar com console aberto.
8. Verificar se o elemento reaparece após chamadas assíncronas.

Uma correção que funciona apenas após limpar o cache não está necessariamente concluída.

---

## 6. NÃO REMOVER UM BLOCO GLOBAL PARA CORRIGIR APENAS UM WORKSPACE

Já aconteceu de ocultar cards no modo “Novo Produto” e, como efeito colateral, remover também informações da listagem normal.

Quando uma tela possui modos como:

```text
/produtos
/produtos?workspace=new
/produtos?workspace=edit
```

a alteração deve respeitar exatamente o contexto.

Não remover o componente de forma global.

Usar condições claras para cada modo:

- listagem;
- cadastro;
- edição;
- operação em lote;
- consulta.

Depois, testar todos os modos da mesma tela.

---

## 7. NÃO CONSIDERAR UM BUG RESOLVIDO SEM TESTAR O FLUXO VIZINHO

Corrigir apenas o ponto mostrado no print pode gerar regressões em outra parte.

Exemplos de fluxos que precisam ser testados juntos:

### Produtos

- listagem;
- novo produto;
- edição;
- filtros;
- categorias;
- PDV;
- Compras;
- Orçamentos;
- Estoque;
- Loja Virtual.

### Contas a Pagar

- listagem;
- parcela;
- valor total;
- filtros;
- pagas;
- parciais;
- cards superiores;
- histórico;
- edição;
- pagamento;
- estorno;
- mês atual;
- mês futuro;
- fornecedores.

### Caixa

- abertura manual;
- fechamento manual;
- abertura automática;
- fechamento automático;
- caixa já fechado;
- caixa reaberto antes do horário automático;
- múltiplos turnos;
- movimentações do PDV.

A correção precisa ser validada pelo impacto, não apenas pela linha alterada.

---

## 8. NÃO MOSTRAR O VALOR TOTAL QUANDO A LISTA REPRESENTA PARCELAS

Em Contas a Pagar, já foi exibido o valor total da despesa na coluna em que o usuário precisava localizar o valor de cada parcela.

Regra:

> A informação apresentada precisa corresponder à unidade visual da linha.

Se cada linha representa uma parcela, mostrar:

- valor da parcela;
- vencimento da parcela;
- situação da parcela;
- pagamento da parcela.

O valor total pode aparecer nos detalhes ou em coluna separada, mas não substituir o valor da parcela.

---

## 9. NÃO CRIAR FILTRO APENAS PELO STATUS DO REGISTRO PRINCIPAL

No financeiro, filtrar “Paga” ou “Parcial” pode exigir analisar parcelas, e não apenas o status da despesa principal.

Uma conta pode estar:

- aberta;
- parcialmente paga;
- totalmente paga;
- vencida;
- estornada;

conforme o estado de suas parcelas.

Sempre entender qual é a fonte real do status exibido.

Filtros financeiros devem considerar:

- status da despesa;
- status das parcelas;
- data de vencimento;
- data de pagamento;
- estornos;
- período selecionado.

---

## 10. NÃO ZERAR CARDS AO APLICAR UM FILTRO SEM DEFINIR A REGRA

Já ocorreu de o filtro “Contas pagas” não apresentar os registros corretamente e ainda zerar os indicadores superiores.

Antes de implementar cards, definir se eles representam:

- toda a base;
- apenas o período;
- apenas o resultado filtrado;
- registros ativos;
- registros pagos;
- parcelas ou contas;
- valor financeiro ou quantidade.

Essa regra deve ser consistente.

Não misturar:

- total global em um card;
- resultado filtrado em outro;
- parcelas em um card;
- despesas principais em outro;

sem explicar claramente.

---

## 11. NÃO DEIXAR MENSAGENS TÉCNICAS EM INGLÊS PARA O USUÁRIO

Já surgiram mensagens em inglês no histórico financeiro.

Todas as mensagens visíveis precisam estar em português.

Exemplos:

- `updated` → `Atualizado`;
- `paid` → `Pago`;
- `reversed` → `Estornado`;
- `partial` → `Parcial`;
- `created` → `Criado`;
- `deleted` → `Excluído`.

Também evitar mostrar:

- nomes internos de funções;
- códigos de exceções;
- chaves de JSON;
- mensagens brutas de bibliotecas.

O log técnico pode permanecer interno, mas o histórico do usuário deve ser legível.

---

## 12. NÃO ALTERAR UM SERVICE SEM CONFIRMAR COMO ELE É IMPORTADO

Já aconteceu erro como:

```text
ReferenceError: getErpCategoryService is not defined
```

Isso normalmente acontece quando:

- uma função foi chamada sem importação;
- o nome importado é diferente;
- o service exporta de outra forma;
- o import foi adicionado no arquivo errado;
- a função está fora do escopo;
- existe conflito entre CommonJS e ES Modules.

Antes de chamar qualquer função:

1. Confirmar onde ela é exportada.
2. Confirmar o tipo de exportação.
3. Confirmar o import no início do arquivo.
4. Procurar usos existentes.
5. Reiniciar o servidor.
6. Abrir a rota afetada.

Nunca assumir que o service está disponível globalmente.

---

## 13. NÃO FAZER ALTERAÇÕES GRANDES DIRETAMENTE EM `routes/erp.js`

O arquivo `routes/erp.js` concentra várias áreas importantes e é um ponto de alto risco.

Erros nesse arquivo podem impedir:

- PDV;
- Produtos;
- Clientes;
- Financeiro;
- Compras;
- Categorias;
- Centro de Operações;
- outras páginas do ERP.

Regras ao alterá-lo:

- localizar exatamente a rota;
- evitar mudanças globais;
- não renomear imports sem procurar todos os usos;
- não mover grandes blocos sem necessidade;
- verificar sintaxe;
- reiniciar o servidor;
- testar pelo menos uma rota anterior e posterior ao trecho alterado.

Sempre que possível, colocar regra de negócio em um service e deixar a rota apenas coordenando a requisição.

---

## 14. NÃO CORRIGIR UM ERRO VISUAL APENAS ESCONDENDO O ELEMENTO

Ocultar com CSS pode mascarar um problema de lógica.

Exemplo ruim:

```css
.elemento {
    display: none !important;
}
```

quando o correto seria impedir que o elemento fosse renderizado naquele modo.

O CSS pode ser usado quando o problema é realmente visual. Mas, quando a regra é de contexto ou permissão, corrigir na origem:

- rota;
- estado;
- view;
- condição de renderização;
- JavaScript.

---

## 15. NÃO USAR `!important` COMO PRIMEIRA SOLUÇÃO

O projeto possui Black OLED e tema Claro. Regras agressivas podem corrigir um tema e quebrar o outro.

Antes de usar `!important`:

- conferir especificidade;
- verificar estilos inline;
- localizar regra duplicada;
- identificar o seletor correto;
- conferir variáveis de tema.

Sempre testar:

- fundo;
- texto;
- borda;
- input;
- select;
- modal;
- dropdown;
- hover;
- scrollbar;
- estado desabilitado;
- pré-visualização.

---

## 16. NÃO TESTAR APENAS O BLACK OLED

Já corrigimos telas escuras e depois encontramos problemas no tema Claro, ou o contrário.

Toda entrega visual exige os dois temas.

Checklist obrigatório:

### Black OLED

- nenhum fundo branco indevido;
- inputs escuros;
- contraste legível;
- bordas discretas;
- modais e dropdowns corretos;
- preview sem área clara indevida.

### Claro

- texto escuro legível;
- cards sem contraste excessivo;
- bordas visíveis;
- botões com estados corretos;
- campos não confundidos com áreas desabilitadas.

---

## 17. NÃO CRIAR DUPLICIDADE VISUAL

O Quality ERP já sofreu com:

- cards repetidos;
- barras duplicadas;
- informações repetidas;
- duas áreas de rolagem;
- títulos aparecendo mais de uma vez;
- marca da empresa repetida na pré-visualização.

Antes de adicionar um elemento, procurar se ele já existe:

- no layout principal;
- em partial;
- na view;
- em JavaScript;
- no modelo de impressão;
- no CSS por pseudo-elementos.

Nunca duplicar uma informação apenas porque ela não foi encontrada na primeira busca.

---

## 18. NÃO REMOVER TODAS AS BARRAS DE ROLAGEM AO CORRIGIR ROLAGEM DUPLA

Já ocorreu de remover duas barras, mas depois o usuário não conseguir mais descer na tela.

Quando houver rolagem duplicada, identificar qual contêiner deve rolar:

- a página inteira;
- o modal;
- o painel lateral;
- a lista interna;
- a pré-visualização.

Normalmente apenas um contêiner principal deve possuir:

```css
overflow-y: auto;
```

Mas é necessário preservar o acesso ao conteúdo completo.

Depois de ajustar, testar com bastante conteúdo.

---

## 19. NÃO ALTERAR IMPRESSÃO SEM COMPARAR PREVIEW E RESULTADO REAL

No módulo de comprovantes, a pré-visualização precisa reproduzir o modelo realmente utilizado na impressão.

Já ocorreram problemas como:

- linhas pontilhadas que não existiam no modelo;
- nome da empresa repetido;
- modelo diferente do comprovante real;
- preview quebrado no Black OLED;
- erro EJS;
- alterações que não chegavam à impressão do PDV.

Regra:

> O preview não deve ser uma versão aproximada. Ele deve usar a mesma fonte de modelo da impressão real.

Testar:

- preview;
- impressão pelo PDV;
- O.S. Entrada;
- O.S. Saída;
- Venda;
- reimpressão;
- tema Black;
- tema Claro.

---

## 20. NÃO MODIFICAR EJS SEM VALIDAR A SINTAXE

Já surgiram erros como:

```text
Unexpected token ';'
```

e problemas do `ejs-mate`.

Antes de entregar alterações em `.ejs`:

- conferir abertura e fechamento de `<% %>`;
- conferir `<%= %>`;
- conferir condicionais;
- conferir loops;
- conferir objetos JSON inseridos em scripts;
- conferir aspas;
- conferir includes;
- conferir layout;
- abrir a rota real.

Um erro EJS pode derrubar a tela inteira.

---

## 21. NÃO PASSAR OBJETO OU VALOR INCORRETO PARA FUNÇÕES DE CAMINHO

Também ocorreu erro semelhante a:

```text
path argument must be string
```

Sempre confirmar se funções de arquivo e renderização recebem:

- string;
- caminho absoluto ou relativo válido;
- nome de template existente;
- variável definida;
- extensão esperada.

Nunca passar objeto inteiro quando a função espera o caminho do arquivo.

---

## 22. NÃO CRIAR UMA SEGUNDA FONTE DE VERDADE

O Fluxo de Caixa não deve possuir uma base própria duplicando movimentações.

Ele deve consolidar:

- Caixa;
- PDV;
- O.S.;
- Contas a Receber;
- Contas a Pagar;
- Compras;
- movimentos manuais;
- estornos.

Essa regra vale para outros módulos.

Antes de criar um novo JSON, perguntar:

> Este dado já existe em outro módulo?

Duplicar dados gera:

- divergência;
- estornos incompletos;
- saldos incorretos;
- retrabalho;
- necessidade de sincronização.

---

## 23. NÃO MISTURAR CONCEITOS DE ERP COM LOJA VIRTUAL

O projeto começou como Loja Virtual e evoluiu para ERP.

Por isso, categorias precisaram ser separadas:

### Categorias ERP

Usadas em:

- cadastro de produtos;
- Estoque;
- Compras;
- PDV;
- Orçamentos;
- relatórios;
- operação interna.

### Categorias da Loja Virtual

Usadas em:

- navegação do site;
- slug;
- SEO;
- publicação;
- organização da loja.

Não reaproveitar automaticamente a categoria da loja como categoria operacional.

Também não presumir que um produto ativo no ERP deve estar ativo ou publicado na Loja Virtual.

---

## 24. NÃO ALTERAR O FORMATO DOS JSON SEM MIGRAÇÃO E COMPATIBILIDADE

Os arquivos JSON já contêm dados reais.

Qualquer mudança de estrutura pode quebrar registros antigos.

Ao adicionar um campo:

- usar valor padrão;
- aceitar registros que ainda não possuem o campo;
- não exigir migração imediata para leitura;
- documentar a mudança;
- preservar códigos existentes;
- testar com dados antigos.

Nunca renomear ou remover um campo sem mapear todos os leitores e gravadores.

---

## 25. NÃO APAGAR DADOS SEM IDENTIFICAR EXATAMENTE O QUE É REAL E O QUE É TESTE

Na limpeza de testes, existiam dados reais que não podiam ser removidos:

- 20 contas reais em Contas a Pagar;
- compra real `COM-8`;
- clientes migrados;
- histórico operacional importante.

Antes de qualquer limpeza:

1. Fazer backup.
2. Definir critérios objetivos.
3. Identificar IDs reais preservados.
4. Verificar vínculos.
5. Simular o que será removido.
6. Informar contagem.
7. Só então executar.

Não limpar uma pasta inteira apenas porque contém registros de teste.

---

## 26. NÃO ESTORNAR OU EXCLUIR APENAS EM UMA TELA

Uma venda ou operação pode aparecer em:

- histórico;
- Centro de Operações;
- Caixa;
- Estoque;
- Contas a Receber;
- comissão;
- movimentações;
- relatórios;
- fluxo financeiro.

Excluir apenas o registro principal cria dados órfãos.

Toda operação de:

- cancelamento;
- estorno;
- exclusão;
- limpeza;

precisa mapear todos os efeitos relacionados.

---

## 27. NÃO TRATAR ESTORNO COMO SIMPLES EXCLUSÃO

Um estorno real precisa deixar histórico.

Dependendo da origem, deve:

- reverter Caixa;
- reverter Estoque;
- ajustar Receber ou Pagar;
- atualizar Centro de Operações;
- afetar Fluxo de Caixa;
- afetar DRE/DFC futuramente;
- registrar usuário, data e motivo.

Não apagar silenciosamente registros reais estornados.

Limpeza de testes é uma operação diferente de estorno operacional.

---

## 28. NÃO DESCONSIDERAR A ORIGEM DO REGISTRO

Registros podem vir de:

- PDV;
- O.S.;
- Compra;
- Manual;
- Migração;
- Automação.

As permissões e ações dependem da origem.

Exemplo:

Uma Conta a Pagar gerada por Compra não deve ser estornada livremente como uma despesa manual, porque isso pode quebrar o vínculo com a compra.

Sempre preservar e consultar o campo de origem.

---

## 29. NÃO IMPLEMENTAR CONFIGURAÇÕES SEM TESTAR TODOS OS ESTADOS

Ao criar uma configuração, testar:

- ativada;
- desativada;
- sem valor salvo;
- valor antigo;
- usuário que nunca abriu a configuração;
- cadastro já existente;
- novo cadastro.

Exemplos:

- CPF obrigatório;
- CNPJ obrigatório;
- permissão de alterar CNPJ;
- vender sem estoque;
- fechamento automático do Caixa;
- abertura automática;
- múltiplos turnos.

Uma configuração precisa funcionar também com dados legados.

---

## 30. NÃO IGNORAR CASOS DE BORDA EM AUTOMAÇÕES DO CAIXA

Em abertura e fechamento automático, considerar:

- caixa já fechado no horário;
- caixa já aberto;
- fechamento automático executado;
- usuário reabriu manualmente;
- abertura automática futura;
- servidor ficou desligado no horário;
- processo iniciou depois do horário;
- múltiplos turnos;
- execução duplicada;
- diferença de segundos;
- reinício do servidor.

Toda automação deve ser idempotente: executá-la duas vezes não pode duplicar operações.

---

## 31. NÃO INTERPRETAR “FUNCIONOU” COMO AUTORIZAÇÃO PARA REFAZER A ÁREA

Quando o usuário confirma que uma parte está funcionando, ela deve ser preservada.

Não usar uma nova solicitação como oportunidade para:

- reorganizar módulo inteiro;
- trocar layout;
- alterar nomenclaturas;
- refatorar sem necessidade;
- adicionar ideias não solicitadas.

No Quality ERP, estabilidade tem prioridade sobre “melhorias” não pedidas.

---

## 32. NÃO VOLTAR FUNCIONALIDADES QUE JÁ HAVIAM SIDO REMOVIDAS

Já aconteceu de uma entrega restaurar elementos que tinham sido removidos em versões anteriores.

Isso acontece quando se usa uma base antiga ou quando arquivos são substituídos integralmente.

Antes de editar:

- confirmar que o ZIP recebido é a base mais recente;
- comparar com o estado atual;
- não copiar arquivos inteiros de versões antigas;
- fazer alterações pontuais;
- conferir o histórico recente da área.

---

## 33. NÃO USAR UMA BASE ANTIGA PARA PRODUZIR O ZIP

Sempre trabalhar em cima do último ZIP enviado pelo usuário.

O ZIP final deve conter somente:

- arquivos novos;
- arquivos modificados;
- documentação pertinente.

Não enviar o projeto inteiro quando foi solicitado apenas o conjunto alterado.

Também informar:

- lista exata dos arquivos;
- motivo da alteração;
- checklist de testes.

---

## 34. NÃO PROMETER UMA ENTREGA QUE AINDA NÃO FOI PRODUZIDA

Nunca responder como se:

- o código já tivesse sido corrigido;
- o ZIP já estivesse pronto;
- todos os testes tivessem sido executados;
- a documentação completa tivesse sido gerada;

quando isso ainda não aconteceu.

Usar linguagem objetiva:

- “Analisei” somente quando analisou.
- “Corrigi” somente quando alterou.
- “Testei” somente quando executou o teste.
- “Mapeei” somente quando confirmou as dependências.

Transparência é obrigatória.

---

## 35. NÃO AFIRMAR QUE TESTOU O SISTEMA INTEIRO SEM TER EXECUTADO O SERVIDOR

Análise estática não equivale a teste funcional.

É possível confirmar por código:

- sintaxe aparente;
- imports;
- relações;
- condições;
- estrutura.

Mas testes como:

- abrir tela;
- aplicar filtro;
- salvar;
- imprimir;
- pagar;
- estornar;
- trocar tema;

exigem execução real.

Quando não for possível executar, informar:

> “A alteração foi validada estaticamente e precisa ser confirmada no ambiente local.”

---

## 36. NÃO CRIAR CARDS OU INFORMAÇÕES SEM UTILIDADE PRÁTICA

O usuário já deixou claro que não deseja:

- excesso de cards;
- contadores irrelevantes;
- informações repetidas;
- “0 selecionados” sem utilidade;
- telas longas;
- configurações confusas.

Antes de adicionar um elemento, responder:

1. Qual decisão ele ajuda o usuário a tomar?
2. Qual ação ele acelera?
3. É usado diariamente?
4. Já existe em outro local?

Se não houver uma resposta clara, provavelmente não deve ser adicionado.

---

## 37. NÃO PRIORIZAR BELEZA SOBRE VELOCIDADE

O Quality ERP deve ser bonito, mas principalmente rápido.

Evitar:

- animações pesadas;
- muitos cards;
- tabelas carregando todos os registros;
- DOM excessivo;
- filtros que recalculam tudo no navegador;
- carregar milhares de clientes de uma só vez.

A paginação de Clientes foi reduzida para 20 justamente para preservar agilidade.

Esse padrão deve ser considerado em outras listagens.

---

## 38. NÃO ALTERAR O PADRÃO DE PAGINAÇÃO SEM NECESSIDADE

Quando um módulo já possui padrão validado, mantê-lo.

Em Clientes:

- 20 por página.

Em outras listagens, seguir a configuração definida para o módulo.

Não alterar para 25, 50 ou “todos” apenas por preferência pessoal.

Opções de grande volume devem ser conscientes e, quando necessário, mostrar aviso de carregamento.

---

## 39. NÃO CRIAR NOMES OU CÓDIGOS DIFERENTES DO PADRÃO

O sistema tem convenções próprias.

Exemplos:

- códigos de cliente sem zeros desnecessários;
- produtos com prefixo `PRD-`;
- status em português;
- origem padronizada;
- nomes operacionais simples.

Antes de criar um novo identificador, procurar padrões existentes.

Não gerar códigos com excesso de zeros nem formatos diferentes em telas distintas.

---

## 40. NÃO ALTERAR DADOS DO ERP PARA ATENDER UMA NECESSIDADE EXCLUSIVA DO SITE

Campos ERP e Loja Virtual possuem finalidades diferentes.

Exemplos:

- Nome ERP;
- Nome Loja Virtual;
- status ERP;
- status Loja Virtual;
- categoria ERP;
- categoria Loja Virtual;
- publicação;
- SEO.

Alterações de site não devem mudar a operação interna automaticamente.

---

## 41. NÃO FAZER PUBLICAÇÃO AUTOMÁTICA APENAS PORQUE O PRODUTO ESTÁ ATIVO

Regras atuais:

- ERP Ativo permite uso operacional.
- ERP Inativo impede novas operações, mas preserva histórico.
- Loja Virtual Ativo não significa necessariamente publicado.
- Loja Virtual Inativo impede exibição no site.
- O padrão de Loja Virtual deve ser inativo quando aplicável.

Não misturar ativação com publicação.

---

## 42. NÃO BLOQUEAR O HISTÓRICO AO INATIVAR UM CADASTRO

Produtos, clientes ou fornecedores inativos ainda podem possuir:

- vendas;
- compras;
- O.S.;
- pagamentos;
- estoque;
- relatórios.

Inativar significa impedir novos usos, não apagar ou esconder o passado.

---

## 43. NÃO TRATAR UM ERRO DE INTERFACE COMO APENAS UM PROBLEMA DE CSS

Um erro visual pode ser causado por:

- HTML duplicado;
- condição de renderização;
- estado incorreto;
- JavaScript;
- dados inconsistentes;
- partial duplicado;
- CSS.

Antes de mexer no CSS, confirmar a origem.

---

## 44. NÃO ENTREGAR UMA SOLUÇÃO SEM EXPLICAR O QUE FOI ALTERADO

Toda entrega deve incluir:

### Arquivos modificados

```text
routes/erp.js
views/...
public/js/...
services/...
```

### Motivo de cada arquivo

```text
routes/erp.js
Ajuste da rota e filtros.

views/...
Correção da apresentação.

services/...
Correção da regra de negócio.
```

### Checklist

```text
[ ] Tela abre
[ ] Filtro funciona
[ ] Black OLED
[ ] Claro
[ ] Dados antigos
[ ] Fluxo relacionado
```

Isso facilita a validação e a reversão.

---

## 45. NÃO FAZER BACKUP APENAS DEPOIS QUE ALGO QUEBRAR

Antes de mudanças relevantes:

- criar backup;
- preservar o ZIP original;
- não sobrescrever a única cópia;
- registrar a versão;
- permitir rollback.

Especialmente em:

- financeiro;
- estoque;
- clientes;
- compras;
- caixa;
- migrações;
- limpeza de dados.

---

## 46. NÃO TRATAR DOCUMENTAÇÃO COMO TEXTO DECORATIVO

A documentação precisa acompanhar o código real.

Quando uma mudança altera:

- rota;
- JSON;
- service;
- comportamento;
- regra;
- status;
- configuração;

atualizar a documentação correspondente.

O ADR deve registrar decisões permanentes, não pequenos bugs.

O Mapa Técnico deve refletir relações confirmadas.

O Onboarding deve explicar como trabalhar no projeto.

---

## 47. NÃO TOMAR DECISÕES DE PRODUTO SEM CONSIDERAR O USO REAL

O Quality ERP é desenvolvido a partir da rotina prática da empresa.

Antes de alterar um fluxo, entender:

- como o usuário trabalha hoje;
- o que o WM10 fazia bem;
- quais passos são realmente utilizados;
- o que precisa ser mais rápido;
- o que pode confundir.

Evitar criar soluções “teoricamente perfeitas” que dificultam o uso diário.

---

## 48. NÃO EXAGERAR NA COMPLEXIDADE

O objetivo não é copiar um ERP gigante.

O sistema deve atender bem o uso real, com:

- menos cliques;
- menos telas;
- menos cadastros desnecessários;
- filtros rápidos;
- ações claras;
- histórico confiável.

Não adicionar:

- estruturas corporativas complexas;
- processos com muitas etapas;
- nomenclatura contábil desnecessariamente técnica;
- permissões excessivamente fragmentadas;

sem necessidade real.

---

## 49. NÃO IGNORAR O CONTEXTO DAS DECISÕES ANTERIORES

Antes de propor uma mudança, consultar:

- Manual de Onboarding;
- Mapa Técnico;
- ADR;
- documentação da versão;
- tarefas anteriores;
- decisões já consolidadas.

Exemplos de decisões que não devem ser revertidas casualmente:

- Clientes congelados;
- Fluxo de Caixa sem base própria;
- separação entre Categorias ERP e Loja Virtual;
- evolução incremental;
- Black OLED e Claro obrigatórios;
- entrega apenas de arquivos modificados;
- preservação dos dados reais.

---

## 50. REGRA PRINCIPAL

Antes de modificar qualquer parte do Quality ERP, responder internamente:

1. Qual arquivo realmente controla isso?
2. Esse arquivo é compartilhado?
3. Qual service já resolve parte do problema?
4. Quais dados reais podem ser afetados?
5. Quais telas dependem disso?
6. Existe comportamento assíncrono?
7. Funciona no Black OLED?
8. Funciona no Claro?
9. Funciona com dados antigos?
10. É possível reverter facilmente?

Se essas respostas ainda não estiverem claras, a alteração não deve começar.

---

# CHECKLIST OBRIGATÓRIO PARA NOVOS COLABORADORES

Antes da primeira alteração:

- [ ] Ler o Manual Oficial de Onboarding.
- [ ] Ler o Registro de Arquitetura.
- [ ] Consultar o Mapa Técnico.
- [ ] Confirmar que está usando a última base.
- [ ] Fazer backup.
- [ ] Mapear rota, service, view, JavaScript e JSON.
- [ ] Identificar módulos afetados.
- [ ] Preservar compatibilidade.
- [ ] Fazer alteração pequena.
- [ ] Validar sintaxe.
- [ ] Testar o fluxo principal.
- [ ] Testar fluxos vizinhos.
- [ ] Testar Black OLED.
- [ ] Testar Claro.
- [ ] Atualizar documentação.
- [ ] Entregar apenas arquivos modificados.
- [ ] Listar todas as alterações.
- [ ] Entregar checklist de validação.
- [ ] Informar claramente o que não pôde ser testado.

---

# MENSAGEM FINAL AO NOVO DESENVOLVEDOR OU IA

O Quality ERP já possui muitos módulos reais e dados importantes. Não é mais um protótipo em que qualquer parte pode ser reescrita livremente.

A prioridade é:

> Preservar o que funciona, corrigir com precisão e evoluir de forma incremental.

Não tente demonstrar produtividade fazendo muitas alterações ao mesmo tempo.

Uma correção pequena, bem localizada e totalmente testada vale mais do que uma grande refatoração que introduz regressões.

Quando houver dúvida, primeiro investigue o fluxo completo. Não adivinhe a arquitetura e não invente informações sobre o código.

Transparência, estabilidade e compatibilidade são requisitos obrigatórios do projeto.