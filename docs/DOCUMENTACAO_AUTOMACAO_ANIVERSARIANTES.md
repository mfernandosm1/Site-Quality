# Quality ERP — Documentação da Automação de Aniversariantes

**Módulo:** Automação WhatsApp → Aniversariantes  
**Versão de referência do módulo:** `0.10.8-aniversariantes-quality-erp`  
**Data da documentação:** 22/08/2026  
**Status:** funcional em ambiente local, com envio automático, simulação e teste real.

---

## 1. Objetivo

A automação de aniversariantes substitui o fluxo antigo **WM10 → GitHub Actions → BotConversa → WhatsApp** por um fluxo nativo do Quality ERP:

**Quality ERP → clientes aniversariantes do dia → WhatsApp conectado ao Inbox → histórico de envio**

O módulo foi desenvolvido para que a configuração possa ser feita diretamente pelo painel, sem necessidade de editar código para alterar mensagem ou horário.

---

## 2. Migração da automação antiga

Antes da ativação do novo fluxo, o workflow antigo do GitHub foi desativado manualmente para evitar duplicidade de mensagens.

Repositório antigo: `aniversariantes-wm10`  
Workflow antigo: `Enviar mensagens de aniversário` / `bot.yml`

O workflow antigo permanece preservado apenas como backup e referência. Ele não deve ser reativado enquanto a automação do Quality ERP estiver em uso.

---

## 3. Arquivos alterados no Quality ERP

A implementação atual está concentrada em dois arquivos:

- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`

### Responsabilidade de cada arquivo

**`routes/automacao_whatsapp.js`**

Contém a lógica do backend:

- configuração da automação;
- consulta dos aniversariantes;
- leitura da data de nascimento;
- montagem da mensagem;
- normalização de telefone;
- monitor automático;
- envio pelo WhatsApp;
- prevenção de duplicidade;
- histórico de envios;
- simulação;
- teste real;
- execução manual;
- logs.

**`views/automacao_whatsapp.ejs`**

Contém a interface da aba **Aniversariantes**:

- ativar/desativar automação;
- horário do envio;
- intervalo entre mensagens;
- edição da mensagem padrão;
- variáveis da mensagem;
- prévia;
- simulador detalhado;
- teste real;
- lista dos aniversariantes do dia;
- botão “Executar agora”.

---

## 4. Fonte dos aniversariantes

A automação usa diretamente os clientes cadastrados no **Quality ERP**.

O campo utilizado para identificar o aniversário é:

`birthDate`

A data é comparada pelo **dia e mês**, sem considerar o ano de nascimento para definir se o cliente é aniversariante do dia.

Formatos de data atualmente aceitos:

- `AAAA-MM-DD`
- `DD/MM/AAAA`
- `DD-MM-AAAA`
- `DD.MM.AAAA`

Clientes sem uma data válida não entram na rotina.

---

## 5. Fuso horário

A rotina usa explicitamente o fuso:

`America/Sao_Paulo`

Isso evita que o horário do servidor ou do sistema operacional provoque disparos no dia ou horário incorreto.

---

## 6. Configurações disponíveis no painel

Na aba:

**Automação WhatsApp → Aniversariantes**

estão disponíveis as seguintes configurações.

### 6.1 Ativar envio automático

Campo:

`Ativar envio automático de aniversariantes`

Quando desmarcado, o monitor continua existindo no servidor, porém não dispara a rotina automaticamente.

A automação deve permanecer desativada durante testes e só deve ser habilitada depois da conferência do simulador e do teste real.

### 6.2 Horário do envio

O horário é totalmente ajustável pelo painel.

Padrão inicial:

`08:00`

Exemplo de configuração usada durante os testes:

`09:30`

A rotina considera que, depois que o horário programado passou, ainda é permitido executar os aniversariantes pendentes daquele dia.

Isso significa que, se o ERP estava desligado no horário exato e for iniciado depois, a rotina ainda pode enviar os pendentes do mesmo dia.

### 6.3 Intervalo entre aniversariantes

Padrão:

`30 segundos`

Faixa permitida:

`0 a 600 segundos`

O intervalo ajuda a evitar disparos instantâneos em massa.

Se configurado como `0`, o sistema utiliza o intervalo humano geral configurado no módulo.

### 6.4 Mensagem padrão

Mensagem inicial configurada:

```text
Olá {primeiro_nome} 😃
Hoje é um dia especial 🎈
Desejamos um aniversário maravilhoso, repleto de alegria e momentos inesquecíveis 🎂🥳🎉

Que o seu dia seja tão incrível quanto você! Esperamos continuar a te atender com a mesma dedicação e qualidade de sempre
```

A mensagem pode ser alterada a qualquer momento diretamente no painel.

Limite atual da mensagem:

`4000 caracteres`

---

## 7. Variáveis disponíveis na mensagem

A mensagem suporta atualmente:

- `{primeiro_nome}` — usa somente o primeiro nome do cliente;
- `{nome}` — usa o nome completo do cliente.

Também existe compatibilidade com:

- `{{primeiro_nome}}`
- `{{nome}}`

### Exemplo

Cliente:

`João da Silva`

Mensagem:

`Olá {primeiro_nome} 😃`

Resultado:

`Olá João 😃`

---

## 8. Tratamento de telefone

A automação tenta utilizar primeiro o celular do cliente e, se não houver, tenta o telefone.

Ordem:

1. `customer.mobile`
2. `customer.phone`

O número é normalizado antes da consulta no WhatsApp.

Também foi mantida compatibilidade com cadastros brasileiros antigos em que um celular possa estar armazenado com **DDD + 8 dígitos**. Nesse caso, o sistema adiciona o nono dígito antes de consultar o WhatsApp.

Antes de enviar, o sistema verifica se o número realmente existe no WhatsApp.

---

## 9. Monitor automático

O monitor é iniciado junto com o módulo de WhatsApp.

### Frequência de verificação

A rotina verifica aproximadamente a cada:

`30 segundos`

Após a inicialização do módulo, ocorre também uma primeira checagem após aproximadamente:

`5 segundos`

### Regra de horário

A execução automática fica apta quando:

`horário atual >= horário configurado`

Por isso, não é obrigatório que o servidor esteja ligado exatamente no minuto programado.

### Nova tentativa

O monitor evita repetir tentativas automáticas de forma excessiva e mantém um intervalo mínimo aproximado de:

`5 minutos`

entre tentativas automáticas relevantes.

---

## 10. Dependência do servidor local

Na arquitetura atual, a automação roda dentro do próprio processo do Quality ERP.

Enquanto o sistema estiver em:

`localhost:3000`

é necessário que:

- o computador esteja ligado;
- o Windows não esteja em suspensão;
- o processo Node.js do Quality ERP esteja rodando;
- a internet esteja disponível;
- o WhatsApp esteja conectado ao Inbox.

**O VS Code não é tecnicamente obrigatório.** O que precisa permanecer ativo é o processo do servidor Node.js.

Como melhoria futura, o ERP poderá:

1. rodar como serviço automático do Windows; ou
2. ser hospedado em servidor/VPS/nuvem 24 horas por dia.

A segunda opção é a arquitetura recomendada para a versão comercial e multiempresa.

---

## 11. Simulador

O simulador foi criado para conferir a rotina sem enviar mensagens.

Botão:

`Simular rotina de hoje`

### Informações exibidas

O simulador detalhado apresenta:

- status do WhatsApp;
- horário programado;
- quantidade total de aniversariantes encontrados;
- quantidade que será enviada;
- quantidade já enviada no dia;
- quantidade sem telefone válido;
- intervalo configurado;
- tempo estimado da rotina;
- situação da automação: ativa/desativada;
- lista cliente por cliente;
- telefone;
- status individual;
- mensagem final personalizada.

O simulador não altera o histórico e não envia nenhuma mensagem.

Aviso exibido na tela:

`Simulação apenas — nenhuma mensagem foi enviada.`

---

## 12. Prévia da mensagem

O painel possui uma prévia da mensagem usando um nome de exemplo.

Exemplo padrão da prévia:

`João da Silva`

A prévia permite conferir imediatamente como `{primeiro_nome}` e `{nome}` serão substituídos.

---

## 13. Teste real

O painel permite enviar uma mensagem real para um número informado manualmente.

Esse recurso deve ser usado antes da primeira ativação da automação.

### Comportamento

O teste:

- usa a mensagem atualmente preenchida;
- usa o nome da prévia;
- envia pelo WhatsApp conectado;
- verifica se o número existe no WhatsApp;
- registra log;
- **não marca nenhum aniversariante como enviado**.

Portanto, um teste realizado no próprio número do administrador não interfere no disparo real dos clientes.

---

## 14. Execução manual

Existe o botão:

`Executar agora`

Ele dispara a rotina para todos os aniversariantes pendentes do dia.

Por segurança, a execução manual exige que a automação de aniversariantes esteja ativada.

Antes da execução, a interface solicita confirmação.

---

## 15. Proteção contra duplicidade

A automação possui duas proteções principais.

### 15.1 Por cliente

Antes de enviar, o sistema consulta o histórico usando:

- data do envio;
- ID do cliente.

Se aquele cliente já estiver com status `enviado` no mesmo dia, ele é ignorado.

### 15.2 Por número de telefone

Também é verificado se o mesmo telefone já recebeu uma mensagem de aniversário naquele dia.

Isso protege contra situações em que dois cadastros diferentes apontem para o mesmo número.

### Resultado

Um cliente/número já enviado não deve receber novamente no mesmo dia, mesmo que:

- o servidor seja reiniciado;
- o monitor rode novamente;
- a rotina seja executada manualmente depois.

---

## 16. Histórico de envios

O histórico específico da automação é armazenado em:

`aniversariantes_envios.json`

Estrutura principal:

```json
{
  "version": 1,
  "items": []
}
```

O histórico mantém até os últimos:

`5000 registros`

Cada registro pode armazenar, entre outros dados:

- data;
- cliente;
- telefone;
- status;
- mensagem;
- origem da execução;
- erro;
- número de tentativas;
- horários de criação/atualização.

Status usados no fluxo incluem:

- `enviado`
- `erro`

Na interface também são derivados estados como:

- pendente;
- sem telefone;
- já enviado.

---

## 17. Tratamento de erros

Quando uma mensagem falha:

- o erro é registrado no histórico;
- o cliente não é marcado como enviado;
- a rotina pode tentar novamente posteriormente.

Na execução automática, um mesmo registro com erro é limitado a até aproximadamente:

`3 tentativas automáticas`

Depois disso, o erro permanece visível para análise e evita tentativas automáticas infinitas no mesmo dia.

---

## 18. WhatsApp desconectado

Se chegar o horário e houver aniversariantes pendentes, mas o WhatsApp estiver desconectado:

- nenhuma mensagem é marcada como enviada;
- o sistema registra que está aguardando conexão;
- os clientes continuam pendentes;
- quando o WhatsApp voltar e o monitor rodar novamente, a rotina poderá prosseguir.

---

## 19. Limite diário

A rotina respeita o limite diário geral configurado no módulo:

`limiteDiario`

Padrão atual:

`40 mensagens`

Esse valor pode ser alterado nas configurações gerais do módulo de Automação WhatsApp.

Se a quantidade de aniversariantes ultrapassar o limite, a rotina interrompe o processamento restante e sinaliza que o limite foi alcançado.

---

## 20. Logs

A automação registra eventos no sistema geral de logs do módulo.

Principais eventos implementados:

- `aniversario_config_atualizada`
- `aniversario_enviado`
- `aniversario_erro`
- `aniversario_rotina_concluida`
- `aniversario_aguardando_whatsapp`
- `aniversario_monitor_erro`
- `aniversario_teste_enviado`
- `aniversario_teste_erro`

Esses eventos facilitam suporte e diagnóstico futuro.

---

## 21. Endpoints do módulo

### Salvar configurações

`POST /automacao-whatsapp/aniversariantes/configuracoes`

Salva:

- ativo/desativado;
- horário;
- mensagem;
- intervalo.

### Simular rotina

`GET /automacao-whatsapp/aniversariantes/simular`

Retorna a situação atual sem enviar nada.

### Enviar teste real

`POST /automacao-whatsapp/aniversariantes/testar`

Envia uma mensagem de teste sem alterar o histórico de aniversariantes.

### Executar agora

`POST /automacao-whatsapp/aniversariantes/executar-agora`

Executa os aniversariantes pendentes do dia.

---

## 22. Procedimento recomendado antes de ativar

Sempre que houver alteração relevante na automação:

1. manter a automação desativada;
2. conferir os aniversariantes encontrados;
3. conferir horário e intervalo;
4. revisar a mensagem;
5. rodar `Simular rotina de hoje`;
6. revisar clientes e telefones;
7. conferir as mensagens personalizadas;
8. enviar teste real para um número próprio;
9. confirmar que a mensagem chegou corretamente;
10. ativar a automação;
11. salvar as configurações.

---

## 23. Procedimento diário esperado

Quando estiver tudo configurado, nenhuma ação manual deve ser necessária.

Fluxo normal:

1. servidor do Quality ERP está ativo;
2. WhatsApp está conectado;
3. monitor verifica o horário;
4. horário configurado é atingido;
5. ERP consulta os clientes aniversariantes;
6. ERP ignora quem já recebeu;
7. ERP valida telefone/WhatsApp;
8. mensagem é personalizada;
9. mensagem é enviada;
10. histórico é gravado;
11. próximo cliente aguarda o intervalo configurado;
12. rotina termina e grava log do resultado.

---

## 24. Cuidados operacionais

- Não reativar o workflow antigo do GitHub enquanto o novo estiver ativo.
- Não apagar `aniversariantes_envios.json` em produção sem necessidade, pois ele protege contra duplicidade.
- Antes de alterar manualmente arquivos de dados, fazer backup.
- Manter data de nascimento e telefone dos clientes atualizados.
- Após alterações de código, reiniciar o servidor do Quality ERP.
- Em ambiente local, impedir suspensão automática do computador durante o período em que o ERP deve operar.

---

## 25. Melhorias futuras recomendadas

### Infraestrutura

- executar o ERP como serviço do Windows;
- migrar backend para VPS/nuvem 24/7;
- separar scheduler/worker de automações do servidor web;
- criar mecanismo de fila persistente para rotinas críticas.

### Painel

- histórico visual completo dos aniversários enviados;
- filtro por período;
- reenviar manualmente um cliente específico;
- botão para ignorar um cliente no dia;
- contador de erros e alertas;
- exportação do histórico;
- configuração por empresa/tenant.

### Mensagens

- mais variáveis de personalização;
- modelos diferentes por loja/empresa;
- mensagem com imagem/mídia;
- regras de horário por dia da semana;
- possibilidade de campanhas diferenciadas.

### Produto comercial

Pensando no Quality ERP multiempresa, cada empresa deverá futuramente possuir isoladamente:

- mensagem própria;
- horário próprio;
- WhatsApp próprio;
- status ativo/desativado;
- histórico próprio;
- timezone próprio;
- limites próprios.

---

## 26. Checklist de validação da versão atual

- [x] Workflow antigo do GitHub desativado
- [x] Consulta direta aos clientes do Quality ERP
- [x] Data de nascimento lida do cadastro
- [x] Horário configurável
- [x] Mensagem configurável
- [x] `{primeiro_nome}`
- [x] `{nome}`
- [x] Intervalo configurável
- [x] Lista de aniversariantes do dia
- [x] Simulador sem envio
- [x] Simulador detalhado cliente por cliente
- [x] Prévia da mensagem
- [x] Teste real para número informado
- [x] Teste não interfere no histórico real
- [x] Envio automático
- [x] Execução manual
- [x] Proteção contra duplicidade por cliente
- [x] Proteção contra duplicidade por telefone
- [x] Histórico persistente
- [x] Tratamento de WhatsApp desconectado
- [x] Logs da rotina
- [x] Fuso `America/Sao_Paulo`
- [x] Compatibilidade com telefone legado brasileiro
- [ ] Hospedagem 24/7 / nuvem
- [ ] Serviço independente do computador da loja

---

## 27. Resumo técnico

**Versão:** `0.10.8-aniversariantes-quality-erp`  
**Timezone:** `America/Sao_Paulo`  
**Horário padrão:** `08:00`  
**Intervalo padrão:** `30 s`  
**Monitor:** a cada `30 s`  
**Limite diário padrão:** `40`  
**Histórico:** `aniversariantes_envios.json`  
**Mensagem máxima:** `4000 caracteres`  
**Fonte:** clientes do Quality ERP (`birthDate`)  
**Canal:** WhatsApp conectado ao Inbox  
**Arquivos principais:** `routes/automacao_whatsapp.js` e `views/automacao_whatsapp.ejs`

---

## 28. Observação final

Esta documentação descreve o estado atual da automação de aniversariantes após a migração inicial da WM10/BotConversa para o Quality ERP/Inbox e após a inclusão do simulador detalhado.

Sempre que houver novas alterações neste módulo, esta documentação deve ser atualizada junto com os arquivos de código para evitar divergência entre o funcionamento real e a documentação do sistema.
