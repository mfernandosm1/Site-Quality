# Marketing IA

## Visão geral

O módulo Marketing IA é uma área do painel administrativo criada para gerar conteúdos de marketing com IA, de forma mais rápida e prática do que abrir ChatGPT/Gemini manualmente.

Objetivo principal:

- Gerar Story
- Gerar Enquete/Interação para Story
- Gerar texto para grupos de WhatsApp
- Gerar legenda para Instagram/Facebook
- Gerar roteiro curto de Reels
- Reformular textos com botões rápidos
- Salvar referências de textos bons
- Salvar histórico
- Personalizar o comportamento para outras empresas

## Arquivos principais

### routes/marketing.js

Arquivo principal do backend do módulo.

Responsável por:

- Renderizar a tela `/marketing`
- Ler e gravar arquivos JSON do módulo
- Chamar a API do Gemini
- Montar o prompt principal da IA
- Montar o prompt de reformulação
- Salvar histórico
- Salvar referências
- Salvar botões rápidos
- Salvar configurações da empresa
- Salvar ações IA personalizadas

Rotas principais:

- `GET /marketing`  
  Carrega a tela do Marketing IA.

- `POST /marketing/generate`  
  Gera os textos principais com IA.

- `POST /marketing/rewrite`  
  Reformula um texto já gerado com base em um botão de ação.

- `POST /marketing/settings/save`  
  Salva as configurações da empresa.

- `POST /marketing/references/add`  
  Adiciona uma referência de texto.

- `POST /marketing/references/delete`  
  Exclui uma referência.

- `POST /marketing/history/delete`  
  Exclui um item do histórico.

- `POST /marketing/history/clear`  
  Limpa todo o histórico.

- `POST /marketing/quick-buttons/save`  
  Salva os botões rápidos do campo principal.

- `POST /marketing/action-buttons/save`  
  Salva os botões de ação da IA usados nos cards de resultado.

### views/marketing.ejs

Arquivo visual da tela Marketing IA.

Responsável por:

- Campo principal do gerador
- Botões rápidos
- Cards de resultado
- Botões de reformulação
- Aba Referências
- Aba Histórico
- Aba Configurações
- Scripts do frontend da tela

## Arquivos JSON criados em data/

Os arquivos abaixo são criados automaticamente dentro da pasta `data` quando usados.

### data/marketing-history.json

Armazena o histórico de conteúdos gerados.

Cada item contém:

- id
- data de criação
- prompt original
- textos gerados

### data/marketing-references.json

Armazena textos usados como inspiração.

A IA não deve copiar esses textos, apenas usar como referência de estilo.

Cada item contém:

- id
- data
- categoria
- texto

### data/marketing-quick-buttons.json

Armazena os botões rápidos que adicionam frases ao campo principal.

Exemplos:

- 📱 Produto
- 🔧 Assistência
- 🎉 Promoção
- 🚚 Frete/envio

### data/marketing-settings.json

Armazena as configurações da empresa.

Campos:

- Nome da empresa
- Segmento
- Cidade/região
- WhatsApp
- Instagram
- Site
- Personalidade
- Produtos principais
- Serviços principais

Essas informações ajudam a IA a adaptar os textos para cada empresa.

### data/marketing-action-buttons.json

Armazena os botões de ação usados para reformular textos.

Exemplos:

- ✨ Melhorar
- 🚀 Mais vendedor
- ✂️ Mais curto
- 🔥 Mais urgência
- 😊 Mais amigável
- 📱 Mais emojis
- 💰 Mais oferta
- 🔄 Nova versão

Cada botão possui:

- id
- label
- instruction

## Gemini

A chave do Gemini deve ficar em:

```txt
C:\Site\painel\.env
```

Exemplo:

```env
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-2.5-flash-lite
```

Importante:

- Nunca enviar `.env` para o GitHub.
- O arquivo `.env` deve estar no `.gitignore`.
- Se a chave aparecer em commit, revogar e gerar outra.

## Cuidados importantes

- Não colocar chave de API dentro de arquivos `.js`, `.ejs`, `.json` ou qualquer arquivo versionado.
- Não apagar os arquivos da pasta `data` sem backup se quiser manter histórico/configurações.
- Antes de grandes alterações, fazer backup de:
  - `routes/marketing.js`
  - `views/marketing.ejs`
  - pasta `data`

## Roadmap sugerido

### V4 - Consultor IA

Criar uma aba separada chamada `🧠 Consultor IA`.

Objetivo:

- Ajudar quando o usuário estiver sem ideias
- Sugerir o que postar hoje
- Criar estratégias por dia da semana
- Sugerir campanhas
- Sugerir foco em produtos ou serviços

Exemplo de uso:

> Estou sem ideias hoje. Quero vender mais celulares usados.

A IA responderia com:

- diagnóstico rápido
- sugestão de campanha
- ideia de story
- ideia de reels
- texto para grupo
