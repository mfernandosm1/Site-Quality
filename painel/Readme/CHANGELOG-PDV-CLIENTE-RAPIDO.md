# Quality ERP — PDV: cadastro rápido de cliente

## Versão
PDV v0.14.8 — 13/08/2026

## Objetivo
Eliminar a necessidade de sair do PDV quando a busca de cliente não encontra um cadastro. O operador pode cadastrar o cliente durante a própria venda/O.S. e continuar exatamente na mesma operação.

## Fluxo implementado
1. No PDV, o operador abre **Buscar cliente** e pesquisa por nome, telefone, CPF/CNPJ, e-mail ou código.
2. Quando não existe resultado, a busca mostra um aviso de **Cliente não encontrado**. Para buscas com 11 ou 14 números, o aviso identifica **CPF não encontrado** ou **CNPJ não encontrado**.
3. O botão **Cadastrar novo cliente** abre o cadastro dentro do próprio PDV, sem navegar para a tela de Clientes.
4. A informação usada na busca é reaproveitada quando possível: CPF, CNPJ, telefone, e-mail ou nome.
5. O formulário possui **Dados principais**, **Endereço** e **Relacionamento**, e respeita os campos obrigatórios configurados no cadastro mestre de clientes.
6. Para pessoa jurídica, ao sair do campo CNPJ com 14 números, a consulta de CNPJ já existente no ERP é reutilizada para preencher dados públicos disponíveis.
7. Ao salvar, o cliente é inserido na lista do PDV e selecionado automaticamente na operação atual, sem recarregar a página e sem perder itens, pagamentos, vendedor, observações ou demais dados da venda/O.S.

## Proteções contra duplicidade
- Continua sendo utilizada a validação central do `CustomerService`.
- Se o CPF/CNPJ já estiver cadastrado, o PDV mostra o cliente existente e oferece **Usar este cliente no PDV** quando ele está ativo.
- Em possíveis duplicidades por telefone/e-mail, o operador pode selecionar o cadastro existente ou, quando permitido pela regra atual do ERP, escolher **Salvar mesmo assim**.
- Cliente inativo não é reativado silenciosamente pelo PDV; o operador recebe orientação para reativá-lo no cadastro de clientes.

## Arquivos alterados
- `views/pdv.ejs`
  - novo estado visual de cliente não encontrado;
  - cadastro de cliente dentro do PDV;
  - preenchimento inicial conforme a pesquisa;
  - tratamento de duplicidades;
  - seleção automática após salvar;
  - consulta de CNPJ dentro do cadastro rápido;
  - PDV atualizado para v0.14.8.
- `routes/erp.js`
  - disponibiliza ao PDV as classificações e configurações de campos do cadastro de clientes.

## Arquivo novo
- `Readme/CHANGELOG-PDV-CLIENTE-RAPIDO.md`

## Validação técnica executada
- `node --check routes/erp.js`
- validação de sintaxe do JavaScript principal embutido em `views/pdv.ejs` após extração do bloco para checagem com Node.

## Observação
A gravação continua usando `POST /erp/clientes` e o `CustomerService`. Não foi criada base paralela nem regra duplicada de persistência.
