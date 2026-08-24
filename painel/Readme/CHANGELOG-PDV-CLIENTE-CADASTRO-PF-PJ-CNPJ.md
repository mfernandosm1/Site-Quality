# PDV — Cadastro de cliente PF/PJ e consulta automática de CNPJ

## Objetivo
Alinhar o cadastro de cliente aberto dentro do PDV ao comportamento da Central do Cliente, sem obrigar o operador a sair da venda ou O.S.

## Ajustes realizados
- Corrigida a exibição condicional dos campos de **Pessoa física** e **Pessoa jurídica** no modal do PDV.
- **Nome fantasia**, Situação cadastral, Data de abertura, Natureza jurídica, Porte e CNAE agora aparecem somente para **Pessoa jurídica**.
- Data de nascimento, Renda mensal, Profissão, Cônjuge, Nome do pai e Nome da mãe aparecem somente para **Pessoa física**.
- O campo **Tipo de pessoa** passa a identificar claramente Pessoa física / Pessoa jurídica.
- CPF e CNPJ recebem máscara conforme o tipo escolhido.
- CPF e CNPJ são validados antes do cadastro; documento inválido impede o salvamento.
- O PDV verifica documento já existente na lista de clientes antes de concluir o cadastro.
- Para Pessoa jurídica, ao informar um CNPJ válido o sistema usa a mesma rota de consulta da Central do Cliente e preenche automaticamente os dados retornados da empresa.
- A consulta de CNPJ pode preencher Razão social, Nome fantasia, Inscrição estadual, situação cadastral, abertura, natureza jurídica, porte, CNAE, telefone, celular, e-mail e endereço.
- Adicionado retorno visual de CNPJ válido, consulta em andamento, sucesso ou falha da consulta.
- CEP no cadastro pelo PDV passa a consultar endereço automaticamente, seguindo o comportamento da Central do Cliente.
- Mantida a seleção automática do novo cliente no PDV após salvar.

## Correção importante de interface
A regra CSS do grid do PDV estava sobrescrevendo o atributo HTML `hidden`, fazendo campos exclusivos de Pessoa jurídica aparecerem também para Pessoa física. Foi adicionada uma regra explícita para respeitar o estado oculto dos campos e painéis.

## Arquivo alterado
- `views/pdv.ejs`
