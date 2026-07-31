# ERP Quality — Fornecedores v0.12.5

## 1. Objetivo

Implantar o Cadastro Mestre de Fornecedores como base única para as futuras integrações com Produtos, Compras, Estoque e Financeiro.

A implementação segue o mesmo padrão estrutural do módulo Clientes v0.12.2:

- rota Express;
- service dedicado;
- armazenamento JSON com escrita atômica;
- listagem operacional;
- drawer lateral de cadastro;
- validação no navegador e no servidor;
- suporte aos temas Claro, Escuro, Black OLED e Dark Blue.

## 2. Arquivos criados

- `services/supplier-service.js`
- `views/fornecedores.ejs`
- `public/js/fornecedores.js`
- `data/erp/suppliers/suppliers.json`
- `data/erp/suppliers/supplier-settings.json`
- `docs/ERP_FORNECEDORES_v0.12.5.md`

## 3. Arquivos alterados

- `routes/erp.js`
- `views/erp_dashboard.ejs`
- `public/css/painel-theme.css`

O arquivo `routes/navigation.js` é enviado no pacote sem alteração funcional, apenas para preservar a referência da versão analisada.

## 4. Funcionalidades implantadas

### Cadastro

- Pessoa Física ou Pessoa Jurídica.
- Fornecedor Nacional ou Importado.
- Nome/Razão Social.
- Nome Fantasia.
- CPF/CNPJ.
- RG/Inscrição Estadual.
- Inscrição Municipal.
- Pessoa de contato.
- Telefone, WhatsApp, e-mail e website.
- Endereço completo.
- Markup padrão.
- Moeda padrão BRL ou USD.
- Condição e forma de pagamento.
- Observações.
- Situação Ativo/Inativo.

### Listagem

- KPIs de total, ativos, inativos e novos no mês.
- Pesquisa por código, nome, fantasia, documento, contato, telefone, e-mail e cidade.
- Filtros por situação, tipo de pessoa e origem.
- Abertura do cadastro para edição pelo botão “Ver detalhes”.

## 5. Validação de documentos

A validação local é obrigatória e não depende da internet.

### CPF

- Exige 11 números.
- Rejeita sequências repetidas.
- Valida os dois dígitos verificadores.
- Impede o salvamento quando inválido.

### CNPJ

- Exige 14 números.
- Rejeita sequências repetidas.
- Valida os dois dígitos verificadores.
- Impede o salvamento quando inválido.

### Duplicidade

O sistema bloqueia outro fornecedor com o mesmo:

- CPF/CNPJ;
- e-mail, quando informado.

## 6. Consulta de CNPJ

A rota `/erp/fornecedores/consultar-cnpj/:cnpj` utiliza a BrasilAPI como auxílio de preenchimento.

Dados aproveitados quando disponíveis:

- razão social;
- nome fantasia;
- situação cadastral;
- telefone;
- e-mail;
- CEP;
- endereço;
- número;
- complemento;
- bairro;
- cidade;
- estado.

A consulta externa não substitui a validação local. Quando o serviço não responder, o cadastro manual continua disponível para um CNPJ matematicamente válido.

## 7. Consulta de CEP

A tela utiliza o ViaCEP diretamente no navegador para preencher:

- rua;
- bairro;
- cidade;
- estado;
- complemento, quando disponível.

Falha na consulta não impede o preenchimento manual.

## 8. Armazenamento

Local:

`C:\Site\painel\data\erp\suppliers`

Arquivo principal:

`suppliers.json`

Cada registro recebe:

- `id` técnico iniciado por `FOR-`;
- código sequencial de seis dígitos;
- `companyId: quality-principal`;
- datas de criação e atualização;
- usuário responsável;
- estrutura de links futuros;
- estrutura de estatísticas futuras.

## 9. Integrações preparadas

O cadastro contém estruturas reservadas para:

- `productIds`;
- `purchaseOrderIds`;
- `payableIds`;
- quantidade de produtos vinculados;
- produtos ativos;
- total comprado;
- data da última compra.

Esses campos não são calculados nesta versão. Foram incluídos somente para preparar a integração futura sem duplicar cadastros.

## 10. Instalação

Antes de substituir arquivos, criar backup.

Copiar:

1. `routes/erp.js` para `C:\Site\painel\routes\erp.js`
2. `services/supplier-service.js` para `C:\Site\painel\services\supplier-service.js`
3. `views/fornecedores.ejs` para `C:\Site\painel\views\fornecedores.ejs`
4. `views/erp_dashboard.ejs` para `C:\Site\painel\views\erp_dashboard.ejs`
5. `public/js/fornecedores.js` para `C:\Site\painel\public\js\fornecedores.js`
6. `public/css/painel-theme.css` para o local correspondente do CSS atual.
7. A pasta `data/erp/suppliers` para `C:\Site\painel\data\erp\suppliers`
8. Este documento para `C:\Site\docs\ERP_FORNECEDORES_v0.12.5.md`

Não substituir a pasta `data/erp/suppliers` caso ela já contenha dados reais sem antes criar backup.

## 11. Roteiro de testes

1. Reiniciar o painel.
2. Abrir `/erp`.
3. Confirmar que Fornecedores aparece como Ativo.
4. Abrir o módulo.
5. Testar CPF inválido e confirmar bloqueio.
6. Testar CPF válido e cadastro PF.
7. Testar CNPJ inválido e confirmar bloqueio.
8. Testar CNPJ válido.
9. Testar consulta automática de CNPJ.
10. Testar consulta de CEP.
11. Tentar cadastrar documento repetido.
12. Editar um fornecedor.
13. Inativar e reativar.
14. Testar pesquisa e filtros.
15. Conferir os quatro temas do painel.

## 12. Limitações conhecidas

- Consulta de CNPJ depende de serviço externo.
- CEP depende de serviço externo.
- Produtos ainda não podem selecionar fornecedor.
- Não há Pedido de Compra nesta versão.
- Não há entrada automática no Estoque.
- Não há geração de Conta a Pagar.
- Estatísticas permanecem reservadas para versões futuras.

## 13. Próxima etapa recomendada

Antes de iniciar Compras, implementar a relação Produto × Fornecedor, com:

- fornecedor principal;
- múltiplos fornecedores por produto;
- código do produto no fornecedor;
- último custo;
- prazo de entrega;
- quantidade mínima;
- histórico de preços.

Isso fecha a integração necessária para que o futuro Pedido de Compra use o Cadastro Mestre de Produtos e o Cadastro Mestre de Fornecedores sem duplicações.
