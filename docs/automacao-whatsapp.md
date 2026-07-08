# Automação WhatsApp — Painel Quality

Versão inicial: 0.1.0  
Data: 2026-07-08

## Objetivo

Criar um módulo próprio dentro do Painel Quality para substituir, aos poucos, o uso operacional do BotConversa nos pontos que a Quality realmente utiliza:

- blocos de resposta com texto, pausa, áudio, imagem, arquivo e opções;
- controle de tempo de espera e “digitando” pelo painel;
- simulador de fluxo antes de qualquer envio real;
- preparação para aniversariantes vindos do script WM10;
- base futura para integração com WhatsApp local e possível evolução para CRM/ERP.

## Filosofia da implementação

Este módulo segue a regra de evolução do Painel Quality:

- estabilidade antes de complexidade;
- incremento pequeno e seguro;
- não reescrever o painel;
- manter documentação atualizada;
- criar valor real para a operação da Quality.

A versão 0.1.0 não envia mensagens reais. Ela cria a estrutura visual, dados base e simulador.

## Arquivos criados

```txt
C:\Site\painel\routes\automacao_whatsapp.js
C:\Site\painel\views\automacao_whatsapp.ejs
C:\Site\docs\automacao-whatsapp.md
```

## Arquivos alterados

```txt
C:\Site\painel\server.js
C:\Site\painel\views\index.ejs
```

## Alteração no server.js

Foi adicionada uma nova rota modular:

```js
import automacaoWhatsappRouter from './routes/automacao_whatsapp.js';
app.use('/automacao-whatsapp', automacaoWhatsappRouter);
```

A rota foi adicionada antes dos handlers de preview e URLs amigáveis para evitar conflito com `/:slug`.

## Alteração na dashboard

Foi criado um card grande abaixo da grade principal do dashboard:

```txt
💬 Automação WhatsApp
Blocos de resposta, simulação de fluxo, aniversariantes, logs e configurações.
```

Nada foi adicionado na barra superior vermelha.

## Estrutura de dados

Ao abrir o módulo pela primeira vez, a rota cria automaticamente a pasta:

```txt
C:\Site\Site_with_content\content\automacao_whatsapp
```

E os arquivos:

```txt
blocos.json
contatos.json
fila.json
logs.json
config.json
```

## Blocos

Um bloco contém uma sequência de etapas.

Tipos de etapa disponíveis na versão 0.1.0:

- texto;
- pausa;
- áudio;
- imagem;
- arquivo;
- opções.

Campos importantes:

- `digitandoSegundos`: tempo configurável antes de enviar texto;
- `segundos`: tempo de pausa entre etapas;
- `gravandoSegundos`: tempo configurável antes de áudio;
- `opcoes`: lista com resposta esperada e próximo bloco.

## Simulador

O simulador é obrigatório antes da fase de envio real.

Ele mostra:

- ordem das etapas;
- tempo de digitação;
- pausas;
- caminhos de áudio/imagem/arquivo;
- opções e próximos blocos;
- tempo mínimo estimado do fluxo.

## Aniversariantes

A versão 0.1.0 apenas prepara a área visual.

Fluxo futuro previsto:

```txt
WM10 / script atual
→ webhook interno do Painel Quality
→ fila Automação WhatsApp
→ envio controlado
→ logs e antduplicidade
```

O script atual dos aniversariantes já consulta o WM10, filtra clientes do dia e envia para `BOT_WEBHOOK`. A próxima fase deve trocar a saída do webhook do BotConversa para uma rota interna do Painel Quality.

## Segurança contra bloqueio

Diretrizes que serão seguidas nas próximas fases:

- envio real começa desligado;
- usar simulação antes do envio;
- delays configuráveis;
- limite diário configurável;
- logs de envios e falhas;
- evitar disparo em massa agressivo;
- enviar apenas para clientes com relacionamento/consentimento;
- antduplicidade para aniversariantes.

## Próximas fases

### 0.2.0 — Upload de mídias

- upload de áudio, imagem e arquivo no bloco;
- preview da mídia;
- organização em pasta própria.

### 0.3.0 — Envio local pelo WhatsApp Web

- conexão local;
- QR Code;
- teste de envio manual;
- envio de sequência com delay.

### 0.4.0 — Webhook WM10 / aniversariantes

- rota para receber aniversariantes;
- fila;
- log;
- antduplicidade.

### 0.5.0 — Gatilhos por resposta

- cliente responde 1/2;
- sistema chama próximo bloco;
- controle básico de estado da conversa.

## Observação

Este módulo deve evoluir como parte do Painel Quality, sem copiar todo o BotConversa. O objetivo é criar uma ferramenta específica para a operação da Quality Celulares.
