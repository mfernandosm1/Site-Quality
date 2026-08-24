# Quality ERP — Navegação, endereços, mapa, temas e performance

**Data:** 23/08/2026  
**Pacote:** v0.28.2 — navegação e fluidez

## 1. Endereço assistido sem bloquear digitação manual

Foi criado o arquivo global `public/js/address-autocomplete.js`.

- Ao existir **UF + cidade** no formulário, a digitação da rua passa a sugerir logradouros após 3 caracteres.
- A consulta usa o serviço ViaCEP por cidade/UF/logradouro.
- Há debounce de 280 ms e cache em memória para evitar consultas repetidas e manter o cadastro leve.
- A lista é apenas uma sugestão: **a rua continua sendo um campo livre**, permitindo endereços novos ou não reconhecidos.
- Quando uma sugestão exata é escolhida, o bairro pode ser completado automaticamente quando estiver vazio.
- Como o recurso procura genericamente campos `street`, `city` e `state`, ele atende cadastro de clientes, cliente rápido do PDV, fornecedores e fornecedor rápido das compras.

## 2. Localização de clientes

- A busca do endereço individual no mapa passou a priorizar também o **CEP**, reduzindo erros de localização quando a grafia da rua estiver imperfeita.
- O botão individual foi renomeado para **“Ver endereço”**.
- O **Mapa geral** continua exibindo um marcador por cidade, com tamanho proporcional à concentração de clientes.
- O mapa segue carregamento sob demanda: não pesa a Dashboard enquanto a seção estiver fechada.

> Observação técnica: os clientes atuais não possuem latitude/longitude persistidas no cadastro. Por isso, o mapa geral representa as cidades. Um mapa com milhares de marcadores individuais deverá ser feito futuramente com geocodificação em segundo plano e cache permanente, sem consultar todos os endereços a cada abertura.

## 3. Barra superior global

A barra superior foi reorganizada para funcionar como menu permanente do ERP:

- suporte à **logo configurável da empresa**;
- altura ligeiramente maior para acomodar a identidade visual;
- quando não há logo, permanece um fallback compacto com `Q` + nome da empresa;
- novo campo **[F1] Pesquisar menu**;
- tecla F1 leva o foco direto para a pesquisa;
- Enter abre o primeiro resultado encontrado;
- novo menu global **Atalhos**, acessível de qualquer tela;
- atalhos principais: PDV, Caixa Operacional, Agenda, Inbox e Centro de Operações;
- **Caixa Operacional** foi incluído também dentro do menu Financeiro.

## 4. Atalhos da página inicial

- Removidos os textos grandes `QUALITY ERP`, `Centro de Operações` e `Trabalhe rápido e acompanhe o que realmente importa.`.
- Os ícones rápidos subiram e agora formam um bloco mais compacto chamado **Atalhos rápidos**.
- O nome do atalho aparece sobre o próprio ícone ao passar o mouse, sem abrir texto lateral que atrapalhe os demais atalhos.
- Agenda e personalização da barra permanecem no mesmo bloco.

## 5. Logo e dados da empresa

Em **Configurações → Empresa e identidade** agora é possível:

- alterar nome da plataforma;
- nome fantasia;
- razão social;
- unidade ativa;
- enviar logo em PNG, JPG ou WebP (até 2 MB);
- remover a logo atual.

A logo é salva localmente em `public/uploads/platform/` e usada automaticamente no cabeçalho do ERP.

## 6. Produtos da Loja Virtual

Ao abrir `/produtos` pelo contexto da loja/site, a listagem agora inicia mostrando **LV ativa** por padrão.

- `/produtos` → LV ativa por padrão;
- `/produtos?origem=erp` → mantém a visão ERP com todos os produtos;
- um filtro `lvStatus` informado explicitamente sempre prevalece.

## 7. Agenda — temas escuros

Foram adicionadas correções específicas para **Escuro**, **Dark Blue** e **Black OLED**:

- formulário de nova tarefa;
- campos e selects;
- configurações;
- chips de responsáveis;
- colunas e grupos;
- cards de tarefas;
- blocos de resumo.

O objetivo é eliminar fundos claros e textos sem contraste que apareciam nesses temas.

## 8. Performance e fluidez

Foram reduzidas leituras e parses repetidos de JSON em rotas de uso frequente.

### Cache por `mtime` + tamanho

Arquivos passam a ser reaproveitados em memória enquanto não forem alterados em disco. Ao salvar, o cache é atualizado imediatamente.

Aplicado em:

- clientes;
- comércio/operações;
- contas a receber;
- contas a pagar;
- financeiro;
- estoque;
- leituras gerais do `routes/erp.js`;
- cadastro/listagem de produtos.

Isto é especialmente relevante para `customers.json`, que já possui milhares de clientes e é um dos arquivos maiores consultados por várias telas.

### Analytics

O Analytics não bloqueia mais a abertura da tela aguardando Google Sheets. Foi adotado comportamento **stale-while-revalidate**:

1. abre imediatamente com cache/dados locais;
2. atualiza a fonte externa em segundo plano;
3. reaproveita a atualização por 2 minutos.

Isso elimina a espera externa como requisito para entrar no módulo.

## Arquivos alterados

- `server.js`
- `views/layout.ejs`
- `views/index.ejs`
- `views/configuracoes.ejs`
- `routes/index.js`
- `routes/configuracoes.js`
- `routes/produtos.js`
- `routes/erp.js`
- `routes/analytics.js`
- `services/customer-service.js`
- `services/commerce-service.js`
- `services/receivables-service.js`
- `services/payables-service.js`
- `services/finance-service.js`
- `services/inventory-service.js`
- `public/js/address-autocomplete.js`
- `public/js/inline-supplier-create.js`
- `public/js/dashboard.js`
- `public/css/painel.css`
- `public/css/painel-theme.css`
