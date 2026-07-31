# ERP Quality — Fornecedores v0.12.6

## Objetivo

Refinar o cadastro de fornecedores PF e PJ sem alterar a base já cadastrada e sem iniciar ainda o módulo de Compras.

## Arquivos desta atualização

- `services/supplier-service.js`
- `views/fornecedores.ejs`
- `public/js/fornecedores.js`
- `data/erp/suppliers/supplier-settings.json`

O arquivo `suppliers.EXEMPLO.json` é apenas referência. **Não substitua o seu `suppliers.json` real.**

## Melhorias implantadas

### Pessoa Física

Ao selecionar Pessoa Física, a tela passa a mostrar os campos adequados:

- Nome completo;
- CPF;
- RG;
- Data de nascimento;
- contatos e endereço.

Campos exclusivos de Pessoa Jurídica ficam ocultos.

### Pessoa Jurídica

Ao selecionar Pessoa Jurídica:

- Razão social;
- Nome fantasia;
- CNPJ;
- Inscrição estadual;
- Inscrição municipal;
- consulta automática de CNPJ.

### Máscaras

Aplicadas durante a digitação e também sobre dados retornados pela consulta:

- CPF/CNPJ;
- telefone;
- celular/WhatsApp;
- CEP.

### Contatos adicionais

Nova aba `Contatos`, permitindo cadastrar vários responsáveis do mesmo fornecedor:

- nome;
- setor;
- WhatsApp;
- e-mail.

Exemplos: vendedor, financeiro, garantia e proprietário.

### Dados comerciais

Foram acrescentados:

- prazo médio de entrega;
- quantidade mínima do pedido;
- valor mínimo do pedido;
- dias habituais para realizar pedidos;
- condição de pagamento;
- forma de pagamento preferida;
- moeda padrão.

### Meios de envio

O fornecedor pode ter vários meios habituais marcados:

- Correios;
- Transportadora;
- Motoboy;
- Retirada no local;
- Ônibus/excursão;
- Aéreo;
- Entrega própria;
- Outro.

Há também um campo livre para observações sobre frete e envio.

### Categorias fornecidas

Permite marcar:

- Celulares;
- Peças;
- Acessórios;
- Informática;
- Serviços;
- Outros.

### Alerta interno

Novo campo em destaque para informações importantes, como:

- não comprar sem confirmação;
- exige pagamento antecipado;
- pedido mínimo;
- problema com garantia;
- fornecedor preferencial.

## Compatibilidade de dados

A atualização mantém os fornecedores já cadastrados. Campos novos ausentes em registros antigos recebem valores vazios automaticamente ao abrir e salvar.

## Instalação

Faça backup e substitua:

1. `services/supplier-service.js` em `C:\Site\painel\services\supplier-service.js`
2. `views/fornecedores.ejs` em `C:\Site\painel\views\fornecedores.ejs`
3. `public/js/fornecedores.js` em `C:\Site\painel\public\js\fornecedores.js`
4. `data/erp/suppliers/supplier-settings.json` em `C:\Site\painel\data\erp\suppliers\supplier-settings.json`

Não substitua:

`C:\Site\painel\data\erp\suppliers\suppliers.json`

Essa atualização não precisa alterar novamente o `erp.js`, preservando a correção da consulta de CNPJ que já está funcionando.

## Testes

1. Abrir um fornecedor PJ e conferir a consulta de CNPJ.
2. Confirmar máscara de telefone e CEP.
3. Mudar para PF e verificar os campos dinâmicos.
4. Salvar PF com CPF válido.
5. Adicionar dois contatos.
6. Marcar dois meios de envio.
7. Marcar categorias fornecidas.
8. Preencher prazo e pedido mínimo.
9. Salvar, fechar e abrir novamente.
10. Confirmar que todos os dados permaneceram gravados.
