# Quality ERP — Menu, endereços e agendamento no Inbox

Data: 23/08/2026

## 1. Barra superior / menu global

- A barra superior ganhou um pouco mais de altura para acomodar melhor a logomarca, a pesquisa e os menus.
- Altura mínima global ajustada para 82 px, com espaçamento vertical maior.
- Botões, seletor de tema e navegação permanecem alinhados no centro.
- A barra de atalhos da Dashboard acompanha a nova altura do cabeçalho quando fica fixa.

## 2. Autocomplete de endereço mais rápido

- Debounce do campo Endereço reduzido para aproximadamente 35 ms.
- O aquecimento da base municipal começa praticamente imediatamente após CEP/cidade/UF estarem disponíveis.
- ViaCEP, Nominatim/OpenStreetMap e fallback de vias do município trabalham de forma concorrente; o fallback deixa de adicionar vários segundos depois das primeiras consultas.
- O cache municipal em memória continua sendo reutilizado durante a sessão, deixando pesquisas seguintes da mesma cidade praticamente instantâneas.
- O autocomplete continua usando apenas fontes externas; cadastros antigos de clientes/fornecedores não são usados como fonte de verdade.

### CEP geral x CEP específico

- CEP específico (quando o ViaCEP informa um logradouro) continua rígido: não mistura endereço de outro CEP.
- CEP geral de município (sem logradouro no ViaCEP), como os usados por várias cidades menores, pode localizar vias que possuem CEP por logradouro na fonte externa, desde que pertençam à mesma cidade/UF.
- O CEP digitado pelo usuário é preservado no formulário.
- Foram adicionadas variações de busca para abreviações comuns, como `Rua` ↔ `R.` e `Avenida` ↔ `Av.`. Isso melhora casos como Rua Alexandre da Motta em Carazinho/RS.

## 3. Inbox — agendamento de mensagens

Foi adicionada uma nova ação de relógio no compositor do Inbox.

### O que pode ser agendado

- mensagem de texto;
- imagem JPG, PNG, WebP ou GIF;
- imagem com texto usado como legenda;
- dia e horário futuro, com até 1 ano de antecedência.

### Funcionamento

1. Abra a conversa do cliente no Inbox.
2. Clique no ícone de relógio.
3. Escolha dia e horário.
4. Digite a mensagem e/ou selecione uma imagem.
5. Clique em **Agendar**.

Os agendamentos da conversa aparecem no mesmo modal com os estados:

- Pendente;
- Enviado;
- Erro;
- Cancelado.

Enquanto estiver pendente, o envio pode ser cancelado. Em erro, existe a opção **Tentar agora**.

### Execução automática

- O monitor verifica mensagens vencidas a cada 10 segundos.
- O envio usa a mesma sessão WhatsApp já conectada ao Inbox.
- Se o ERP/notebook estiver desligado ou o WhatsApp estiver desconectado no horário, o item permanece pendente. Ao servidor e WhatsApp voltarem, o item vencido é enviado automaticamente.
- Falhas reais têm até 3 tentativas automáticas, com intervalo entre tentativas. Depois disso ficam em `Erro`, permitindo nova tentativa manual.
- Mensagens enviadas também entram normalmente no histórico do Inbox pelo evento do WhatsApp.

### Persistência

- Controle: `mensagens_agendadas.json` dentro do diretório de conteúdo da Automação WhatsApp.
- Imagens pendentes: `public/uploads/automacao_whatsapp/agendados/`.
- A imagem temporária é removida após envio bem-sucedido ou cancelamento.

## Arquivos alterados

- `public/css/painel.css`
- `public/js/address-autocomplete.js`
- `routes/erp.js`
- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
