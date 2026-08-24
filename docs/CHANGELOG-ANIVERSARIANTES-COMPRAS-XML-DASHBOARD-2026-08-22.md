# Quality ERP — Aniversariantes, Compras XML e Dashboard

Data: 22/08/2026

## Objetivo deste pacote

Este pacote reúne os ajustes solicitados após a ativação da automação real de aniversariantes e os testes do fluxo de Compras por XML.

## 1. Aniversariantes perdidos do dia anterior

### Comportamento

- A rotina automática continua enviando **somente os aniversariantes do dia atual**.
- Ao abrir o painel no dia seguinte, o ERP verifica os aniversariantes do **dia anterior**.
- Se houver clientes cujo aniversário foi no dia anterior e que **não possuem registro de envio concluído** para aquela data, o painel exibe um aviso destacado.
- O aviso mostra claramente:
  - quantidade de aniversários não enviados;
  - data original do aniversário;
  - cliente;
  - WhatsApp;
  - situação do envio.
- Aniversários perdidos **nunca são enviados automaticamente**.
- É possível enviar manualmente:
  - um cliente individualmente; ou
  - todos os pendentes do dia anterior que tenham número válido.
- Clientes que já receberam a mensagem referente àquela data não entram novamente na recuperação.
- O registro do envio atrasado é gravado no histórico usando a **data original do aniversário**, preservando a proteção contra duplicidade.

### Mensagem diferente para atraso

Foi adicionada uma configuração própria: **Mensagem para aniversário perdido (envio manual)**.

A mensagem pode ser alterada no painel e aceita:

- `{primeiro_nome}`
- `{nome}`
- `{data_aniversario}`

O envio manual usa o texto que estiver visível no campo no momento do clique. O botão **Salvar configurações** mantém esse texto como padrão para os próximos usos.

### Segurança

A recuperação do dia anterior não foi adicionada ao monitor automático. Portanto, ligar o computador/servidor no dia seguinte apenas faz o sistema **avisar** sobre os pendentes; nenhum cliente do dia anterior recebe mensagem sem ação do usuário.

## 2. Cadastro rápido de produto durante importação de XML

O botão **+ Produto** da conferência do XML deixou de usar um cadastro apenas com nome.

Agora abre uma janela com:

- Nome do produto;
- **Categoria ERP obrigatória**.

O backend também valida a categoria. Dessa forma, mesmo que a requisição seja feita fora da interface, não é possível usar esse cadastro rápido para criar um produto sem categoria ERP válida.

O produto criado é imediatamente vinculado ao item da NF-e e o vínculo aprendido do XML continua sendo salvo normalmente.

## 3. Valor restante ao adicionar forma de pagamento

Ao clicar em **+ Forma**, o novo campo de valor passa a calcular automaticamente:

`Total da compra - soma das formas já informadas`

Exemplo:

- Total da compra: R$ 511,00
- Primeira forma: R$ 86,50
- Nova forma criada: **R$ 424,50**

O valor nunca é preenchido abaixo de zero.

## 4. Bloqueio de XML/NF-e duplicada

A chave de acesso da NF-e passou a ser usada para impedir importação duplicada.

### Na conferência do XML

Se a chave de 44 dígitos já estiver vinculada a uma compra existente, a importação é interrompida e o sistema informa a compra encontrada e a situação dela.

Exemplo de retorno:

`Este XML já foi importado na compra COM-000123 (Concluída). A mesma NF-e não pode ser importada novamente.`

### Proteção no backend

Também foi adicionada validação ao salvar a compra. Isso evita que uma duplicidade seja criada por outro caminho mesmo que a validação visual seja contornada.

Ao editar a própria compra, a chave dela é desconsiderada na comparação para não bloquear uma atualização legítima.

## 5. Dashboard do ERP — balões dos módulos

Os tooltips flutuantes dos cards de módulos foram removidos porque podiam ficar sobre os cards vizinhos.

A descrição de cada módulo agora aparece **dentro do próprio quadrado**, em texto discreto de até duas linhas.

Também foram ajustados altura mínima e espaçamento dos cards para acomodar essa descrição sem atrapalhar a navegação.

## Arquivos alterados

- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
- `routes/erp.js`
- `services/purchase-service.js`
- `views/compras.ejs`
- `views/erp_dashboard.ejs`
- `public/css/painel.css`

## Versões internas relacionadas

- Automação WhatsApp/Aniversariantes: `0.11.0-aniversariantes-recuperacao-manual`
- Tela de Compras: `0.19.6`

## Checklist de teste

### Aniversariantes

1. Confirmar que a rotina automática de hoje continua funcionando normalmente.
2. Em um cenário com aniversário do dia anterior sem histórico de envio, abrir a aba Aniversariantes.
3. Confirmar que o aviso informa a data anterior e não envia sozinho.
4. Alterar a mensagem de atraso e usar envio manual em um cliente de teste.
5. Confirmar que, depois do envio, o cliente sai da lista de pendentes do dia anterior.

### Compras XML

1. Importar uma NF-e com produto ainda não cadastrado.
2. Clicar em **+ Produto**.
3. Confirmar que categoria é obrigatória.
4. Criar o produto e confirmar que ele aparece vinculado ao item do XML.
5. Informar uma primeira forma de pagamento com valor menor que o total e clicar em **+ Forma**.
6. Confirmar que o novo valor é o restante exato.
7. Salvar/finalizar uma compra importada por XML.
8. Tentar importar o mesmo XML novamente e confirmar o bloqueio pela chave da NF-e.

### Dashboard ERP

1. Abrir `/erp`.
2. Passar o mouse sobre os cards.
3. Confirmar que nenhum balão flutuante cobre outro módulo.
4. Confirmar que as descrições permanecem legíveis dentro de cada card.
