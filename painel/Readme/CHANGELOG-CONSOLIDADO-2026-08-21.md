# Quality ERP — consolidação de ajustes recentes — 21/08/2026

Este documento consolida os ajustes mais recentes que estavam espalhados entre alterações de código e conversas de validação. O objetivo é evitar que decisões de UX e regras operacionais fiquem apenas no histórico de desenvolvimento.

## 1. Tela inicial do ERP

### Cards de módulos
- As descrições longas deixaram de ocupar espaço permanente nos cards.
- Os ícones `i` também foram removidos da tela inicial.
- A descrição agora aparece ao posicionar o mouse sobre o card inteiro ou ao focá-lo pelo teclado.
- Em 21/08/2026 o tooltip passou a ser flutuante (`position: fixed`) e calculado pela área visível da janela:
  - abre abaixo do card quando há espaço;
  - abre acima quando o card está próximo do rodapé da tela;
  - respeita as margens laterais;
  - acompanha rolagem e redimensionamento.
- Motivo: os cards das últimas linhas não devem exigir que o usuário role a página apenas para conseguir ler a explicação.

## 2. PDV — Venda / O.S.

### Mudança de tipo da operação
- Quando uma operação aberta como **Venda** é alterada para **O.S.**, o PDV passa a aplicar imediatamente o status padrão configurado para O.S.
- Na configuração atual, o status padrão de O.S. é **Na bancada** (`defaultOs: true`).
- O mesmo princípio vale ao retornar para Venda: é aplicado o status padrão de venda.
- Ao apenas carregar uma operação já existente do mesmo tipo, o status salvo é preservado e não é sobrescrito.

### Seleção rápida de produtos — já documentado e revisado
- Clique no resultado da busca e `Enter` utilizam a mesma rotina do botão Adicionar.
- Após inclusão, a busca é limpa e recebe foco novamente.
- Referência: `CHANGELOG-PDV-SELECAO-RAPIDA-PRODUTO-V0.27.9.md`.

## 3. Carnê / comprovante de crediário

### Itens vinculados à venda
- O carnê padrão passa a exibir um bloco **ITENS DA VENDA** antes do compromisso de pagamento.
- Para cada item são apresentados:
  - quantidade;
  - nome do produto/serviço;
  - valor unitário quando a quantidade for maior que 1;
  - valor final da linha;
  - desconto, quando existir.
- O valor de **Total no crediário** continua separado do valor dos itens. Isso é importante quando uma venda tiver pagamento misto e apenas parte do total for financiada no crediário.

### Editor de comprovantes
- O editor visual do carnê ganhou a opção **Exibir itens da venda**.
- O título do bloco pode ser personalizado.
- Foi criada a variável avançada `{{crediario_itens}}`.
- O modelo padrão salvo em `data/erp/settings/print-models.json` foi atualizado.
- A rotina de modelos do sistema migra o carnê padrão antigo quando ele ainda não possui `{{crediario_itens}}`, sem substituir um modelo que já tenha configuração visual personalizada.

### Observação de conformidade
O carnê é um documento de apoio do crediário e não substitui documento fiscal ou contrato quando estes forem exigíveis. Para operações de crédito ao consumidor, as informações financeiras obrigatórias devem continuar sendo tratadas nas regras comerciais e documentos aplicáveis. A inclusão dos itens no carnê aumenta a clareza e a rastreabilidade entre a compra e a cobrança.

## 4. Agenda — consolidação da versão atual

### Responsáveis e organização
- Tarefas/compromissos são organizados visualmente por responsável, com cor própria.
- Responsáveis são cadastrados uma vez e selecionados no campo da agenda.
- O gerenciamento passou para **Configurações**, posicionado no topo ao lado de **← Dashboard**.
- A tela mantém filtros por responsável e por situação.

### Tipos personalizados
- Tipos da agenda podem ser cadastrados nas Configurações.
- Cada tipo define se a data é obrigatória ou opcional.
- **Lembrete** não significa mais obrigatoriamente “sem data”:
  - pode possuir data e entrar em Vencidas/Hoje/Próximas;
  - pode ficar sem data e entrar em **Sem data**.

### Datas
- Datas da agenda são validadas no navegador e no serviço.
- Faixa aceita: anos entre 2000 e 2100.

### Análise por responsável
- A análise não aparece para responsáveis recém-cadastrados ou sem base suficiente.
- Requisitos atuais:
  - mínimo de 6 compromissos concluídos com prazo;
  - pelo menos 14 dias de histórico.
- Métricas:
  - percentual concluído no prazo;
  - atraso médio;
  - antecedência média;
  - observação baseada nos próprios dados.
- Itens sem prazo não entram nessa análise.

Referência dedicada: `CHANGELOG-AGENDA-V1.4-DASHBOARD-FORNECEDOR-PF.md`.

## 5. Dashboard / Centro de Operações

### Agenda própria
- Agenda ganhou bloco próprio, separado de **Atenção necessária**.
- Exibe responsável, cor, tipo, título e tempo restante/atraso.
- Priorização atual:
  1. vencidas;
  2. hoje;
  3. próximas até 2 dias;
  4. sem data;
  5. demais próximas.

### Organização do painel
- O ranking **Quem mais comprou nos últimos 30 dias** foi compactado para não consumir uma linha inteira da dashboard.
- O espaço liberado é utilizado para manter informações operacionais relevantes próximas, especialmente Agenda.
- Em **Visão do Negócio**, o filtro padrão passou a ser **Mês**.

## 6. Calculadora Comercial / Orçamentos

### Limpeza visual
Textos explicativos extensos foram movidos para ícones de informação, mantendo a tela mais limpa:
- explicação geral da Calculadora Comercial;
- explicação da área independente de orçamento manual;
- orientação sobre importar da tabela ou criar produto manual;
- orientação **Confira e edite antes de copiar ou enviar** na mensagem ao cliente.

### Tooltips
- Os balões informativos foram ajustados para evitar ficar escondidos atrás da barra superior do Painel Quality.
- A Biblioteca Comercial continua separando modelos e conteúdo usado na mensagem ao cliente.

## 7. Caixa Operacional

### UX
- A descrição **Abertura, movimentações, conferência e histórico de fechamentos** foi movida para informativo compacto.
- A mensagem **Resumo recalculado conforme os filtros ativos.** passa a desaparecer automaticamente após aproximadamente 3 segundos.
- **Resumo por forma de pagamento** inicia recolhido.

### Formas de pagamento exibidas
- O usuário pode escolher quais cards aparecem no Resumo por forma de pagamento.
- A lista usa as formas de pagamento ativas/cadastradas.
- A preferência de exibição fica persistida no navegador.

### Regra do resumo
- O resumo considera recebimentos líquidos por forma vinculados às entradas comerciais consideradas pelo Caixa.
- Recebimentos de vendas, O.S. e Contas a Receber entram na consolidação quando aplicáveis.
- Estornos são abatidos.
- Suprimentos, sangrias e despesas não devem ser misturados como “recebimento por forma de pagamento”.

## 8. Clientes e Fornecedores

### Cliente — data de nascimento
- A Central de Clientes e o cadastro rápido do PDV aceitam digitação/colagem de data em `DD/MM/AAAA`.
- Antes da persistência, o valor é validado e convertido para o padrão interno.
- Referência dedicada: `CHANGELOG-CLIENTES-DATA-NASCIMENTO-COLAR.md`.

### Fornecedor pessoa física
- Pessoa Física utiliza somente **CPF**, sem aceitar CNPJ no campo.
- Campos empresariais não são solicitados para PF:
  - Nome fantasia;
  - Inscrição estadual/RG;
  - Inscrição municipal;
  - Pessoa de contato;
  - Website;
  - consulta CNPJ.
- O backend também remove/ignora campos empresariais em registros PF.
- Referência dedicada: `CHANGELOG-AGENDA-V1.4-DASHBOARD-FORNECEDOR-PF.md`.

## 9. Outros ajustes recentes já encontrados com documentação própria

Durante a revisão, foram localizados changelogs específicos para áreas que não precisam ser duplicadas integralmente aqui:
- Contas a Pagar: vencimento, alteração em massa, total/classificação, filtros e refinamentos de UX;
- Contagem de estoque: conclusão segura, modo contínuo, código/Enter e correções de finalização;
- Compras XML: fornecedor seguro, vínculo definitivo, nome atual do produto, classificação financeira e vencimentos;
- CRM/Inbox: performance, navegação, nova conversa, blocos em tempo real, fluxos e UX;
- Comprovantes de Venda/O.S.: itens, valores, descontos, configuração e modelos;
- PDV: cliente rápido, validações de documento, catálogo sem F5, vendedor automático, operação vazia e busca rápida.

A regra permanece: alterações relevantes devem receber changelog ou entrar numa consolidação como esta, evitando depender somente do histórico da conversa.

## 10. Arquivos diretamente alterados na rodada de 21/08/2026

- `views/erp_dashboard.ejs`
- `public/css/painel.css`
- `views/pdv.ejs`
- `views/configuracoes_comprovantes.ejs`
- `routes/erp.js`
- `data/erp/settings/print-models.json`
- `Readme/CHANGELOG-CONSOLIDADO-2026-08-21.md`

## 11. Checklist de validação manual

### ERP
- Posicionar o mouse nos cards da primeira e da última linha.
- Confirmar que o tooltip aparece inteiro sem exigir nova rolagem.
- Confirmar funcionamento também após rolar a página.

### PDV / O.S.
- Abrir uma Venda em andamento.
- Trocar para **O.S.**.
- Confirmar que o status muda para **Na bancada**.
- Voltar para Venda e conferir o padrão de Venda.
- Abrir uma O.S. existente e confirmar que seu status salvo não é sobrescrito apenas pelo carregamento da tela.

### Carnê
- Finalizar uma venda com crediário e ao menos dois itens.
- Imprimir o carnê.
- Confirmar o bloco **ITENS DA VENDA** com nomes e valores.
- Testar item com quantidade maior que 1 e item com desconto.
- Testar venda com pagamento misto para conferir que **Total no crediário** continua representando somente o valor financiado.
- Abrir Configurações → Comprovantes e Impressões → Carnê e confirmar a opção de exibir/ocultar itens.
