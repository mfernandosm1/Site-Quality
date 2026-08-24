# Quality ERP v0.23.0 — Cadastro Configurável de Clientes

## Objetivo
Permitir configurar os campos do Cadastro Mestre de Clientes, corrigir o modo Claro e separar corretamente campos de Pessoa Física e Pessoa Jurídica.

## Implementado
- Correção visual da tela, tabela e drawer de Clientes no modo Claro.
- Nome fantasia exibido e salvo somente para Pessoa Jurídica.
- Nova área `Configurações > Cadastro de Clientes`.
- Ativação/desativação de campos sem apagar dados existentes.
- Definição de obrigatoriedade.
- Ordenação por número ou botões para cima/baixo, separada por seção.
- Proteção dos campos Tipo de pessoa e Nome/Razão social.
- Restauração da configuração padrão.
- Migração automática da configuração antiga `customer-settings.json`.

## Persistência
Arquivo: `data/erp/customers/customer-settings.json`. O arquivo é criado ou migrado automaticamente pelo `CustomerService`; ele não precisa ser incluído manualmente no pacote incremental.

## Compatibilidade
- Dados de clientes existentes são preservados.
- Campo oculto não é apagado do cadastro existente.
- CPF/CNPJ continua validado quando informado.
- Prevenção de duplicidade permanece ativa.
- PDV, Compras, Estoque, Caixa, Financeiro e Centro de Operações não foram modificados.

## Testes recomendados
1. Abrir Clientes nos temas Claro e Black OLED.
2. Criar PF e confirmar que Nome fantasia não aparece nem é salvo.
3. Criar PJ e confirmar Nome fantasia e consulta CNPJ.
4. Abrir Configurações > Cadastro de Clientes.
5. Ocultar um campo, salvar e conferir novo cadastro/edição.
6. Marcar um campo como obrigatório e validar bloqueio do navegador.
7. Alterar a ordem, salvar e conferir o formulário.
8. Restaurar padrão e conferir o retorno.
9. Editar cliente antigo e confirmar preservação dos dados ocultos.


## Correção complementar — renderização das configurações

- Corrigido erro `ERR_INVALID_ARG_TYPE` ao abrir `/configuracoes/clientes`.
- A variável enviada à view foi renomeada de `settings` para `fieldSettings`.
- O nome `settings` é reservado pelo Express/ejs-mate para as configurações internas de renderização; a colisão removia o caminho da pasta de views utilizado pelo layout.
- A correção não altera dados, preferências salvas ou regras do Cadastro de Clientes.
