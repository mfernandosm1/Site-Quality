# Painel Quality — Clientes ERP

**Versão documentada:** v0.12.2  
**Módulo:** Cadastro Mestre de Clientes  
**Rota principal:** `/erp/clientes`  
**Diretório de documentação recomendado:** `C:\Site\docs`

## 1. Objetivo

O módulo Clientes é o Cadastro Mestre único de pessoas físicas e jurídicas do Painel Quality. Ele foi estruturado para ser a referência central utilizada futuramente por WhatsApp/CRM, Orçamentos, PDV, Ordens de Serviço, Financeiro e demais módulos, evitando cadastros paralelos e duplicidade de informações.

## 2. Princípios da implementação

- Uma única base de clientes para todo o ecossistema Quality.
- Integração por identificadores, sem copiar o cadastro para cada módulo.
- Evolução incremental, preservando módulos estáveis.
- Arquivos JSON com gravação atômica.
- Preparação para multiempresa por meio do campo `companyId`.
- Cadastro rápido, com possibilidade de complementação posterior.
- Documento opcional, porém obrigatoriamente válido quando informado.

## 3. Arquivos principais

### `painel/routes/erp.js`

Responsável pelas rotas do módulo, carregamento da listagem, criação, edição e alteração de situação do cliente.

### `painel/services/customer-service.js`

Serviço central responsável por:

- criar os arquivos de armazenamento;
- higienizar os dados recebidos;
- gerar código interno sequencial;
- validar CPF e CNPJ;
- validar e-mail;
- detectar possíveis duplicidades;
- criar, atualizar, consultar e ativar/inativar clientes;
- gravar os dados de forma atômica.

### `painel/views/clientes.ejs`

Tela operacional da Central do Cliente, com indicadores, filtros, tabela e formulário lateral em abas.

### `painel/public/js/clientes.js`

Comportamento da interface:

- pesquisa e filtros instantâneos;
- abertura e fechamento da ficha lateral;
- cadastro e edição;
- ativação e inativação;
- aviso de possível duplicidade;
- máscara e validação imediata de CPF/CNPJ;
- máscara e consulta automática de CEP;
- preenchimento automático do endereço.

## 4. Armazenamento

Diretório padrão:

```text
C:\Site\painel\data\erp\customers
```

Arquivos:

```text
customers.json
classifications.json
customer-settings.json
```

### `customers.json`

Contém:

- versão da estrutura;
- próximo código sequencial;
- lista de clientes.

### `classifications.json`

Classificações iniciais:

- Nenhum
- Bronze
- Prata
- Ouro
- Diamante

Na fundação atual, as classificações possuem nome, ordem e situação. Regras financeiras e descontos ficam reservados para etapas futuras.

### `customer-settings.json`

Estrutura inicial para campos visíveis e obrigatórios. A tela de configuração desses campos ainda pertence ao roadmap do módulo.

## 5. Campos atuais

### Dados principais

- Tipo de pessoa: física ou jurídica
- Nome / Razão social
- Nome fantasia
- CPF / CNPJ
- RG / Inscrição estadual
- Data de nascimento
- Celular / WhatsApp
- Telefone
- E-mail

### Endereço

- CEP
- Estado
- Rua
- Número
- Complemento
- Bairro
- Cidade

### Relacionamento

- Classificação
- Origem do cliente
- Situação
- Observações

### Campos internos

- ID único
- Código sequencial
- Empresa
- Datas de criação e atualização
- Usuários responsáveis pela criação e atualização
- Vínculos futuros com WhatsApp, orçamentos, vendas e ordens de serviço

## 6. Regras de validação

### Nome

O nome ou razão social é obrigatório.

### CPF e CNPJ

O documento é opcional nesta etapa. Quando preenchido:

- Pessoa Física aceita exclusivamente CPF com 11 dígitos e dígitos verificadores válidos.
- Pessoa Jurídica aceita exclusivamente CNPJ com 14 dígitos e dígitos verificadores válidos.
- Sequências repetidas, como `111.111.111-11`, são rejeitadas.
- CPF informado para Pessoa Jurídica é rejeitado.
- CNPJ informado para Pessoa Física é rejeitado.
- A interface aplica máscara e mostra o resultado da validação.
- O serviço valida novamente no servidor antes de gravar.

A validação no servidor é a regra definitiva; portanto, requisições feitas fora da interface também não conseguem gravar documento inválido.

### E-mail

Quando informado, deve possuir formato válido.

### CEP

- Aceita 8 números.
- Recebe máscara `00000-000`.
- Consulta automática pelo ViaCEP.
- Preenche rua, bairro, cidade e estado quando os dados estiverem disponíveis.
- Número e complemento continuam manuais.
- Falhas na consulta não bloqueiam o cadastro.

## 7. Prevenção de duplicidades

O serviço procura possíveis clientes duplicados por:

- CPF/CNPJ;
- celular;
- telefone;
- e-mail.

Quando encontra correspondência, a interface apresenta os clientes relacionados para revisão. O operador ainda pode confirmar a gravação, pois existem situações reais em que telefones ou e-mails são compartilhados.

Documento inválido nunca pode ser ignorado pelo botão de confirmação de duplicidade.

## 8. Situação do cliente

Clientes não são apagados operacionalmente. O módulo utiliza:

- Ativo
- Inativo

A inativação preserva o histórico e os vínculos futuros do cliente.

## 9. Integrações planejadas

### WhatsApp e CRM

- localizar cliente pelo telefone normalizado;
- vincular conversa ao Cadastro Mestre;
- criar cliente a partir de um contato ainda não vinculado;
- abrir a ficha existente sem duplicação.

### Orçamentos

- associar orçamento salvo ao `customerId`;
- pesquisar orçamentos dentro da ficha do cliente;
- preencher automaticamente o nome quando o orçamento sair de uma conversa vinculada.

### PDV e vendas

- registrar venda com `customerId`;
- histórico de compras;
- ticket médio;
- produtos mais adquiridos;
- última compra.

### Ordens de Serviço

- vincular cliente, aparelhos e atendimentos;
- preservar histórico de reparos e garantias.

### Financeiro e crediário

- limite de crédito;
- parcelas abertas, pagas e vencidas;
- análise de crédito;
- histórico de recebimentos.

Esses campos não devem ser implementados dentro de Clientes antes de seus módulos responsáveis existirem.

## 10. Histórico de versões

### v0.12.0 — Fundação operacional

- Cadastro Mestre.
- Lista, busca e filtros.
- Cadastro e edição.
- Ativar e inativar.
- Código interno automático.
- Classificações iniciais.
- Detecção de possíveis duplicidades.
- Base preparada para integrações futuras.

### v0.12.1 — CEP automático

- Máscara de CEP.
- Consulta ViaCEP.
- Preenchimento automático de rua, bairro, cidade e estado.
- Tratamento de CEP inexistente e falhas de conexão.

### v0.12.2 — Documento confiável

- Máscara dinâmica de CPF ou CNPJ conforme o tipo de pessoa.
- Validação imediata na interface.
- Validação definitiva no servidor.
- Bloqueio de documentos com dígitos verificadores incorretos.
- Bloqueio de sequências repetidas.
- Atualização da identificação visual do módulo.

## 11. Próximas etapas recomendadas

1. Máscaras e validações de celular e telefone.
2. Alerta de duplicidade antes do envio do formulário.
3. Tela de configurações de campos visíveis e obrigatórios.
4. Gestão das classificações.
5. Integração controlada com WhatsApp/CRM.
6. Integração dos orçamentos salvos ao Cadastro Mestre.
7. Ficha histórica consolidada do cliente.

## 12. Regras de segurança para futuras alterações

- Não criar uma segunda base de clientes dentro de WhatsApp, PDV, O.S. ou Financeiro.
- Não remover IDs ou vínculos existentes ao editar um cliente.
- Não permitir exclusão definitiva pela interface operacional.
- Manter gravação atômica dos JSON.
- Validar no servidor todas as regras críticas, mesmo quando já existirem na interface.
- Fazer backup antes de migrações ou mudanças de estrutura.
