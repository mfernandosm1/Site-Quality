# Quality ERP — PDV: validação de CPF/CNPJ na busca de cliente

## Versão
PDV v0.14.9 — 13/08/2026

## Objetivo
Validar CPF e CNPJ diretamente na janela **Buscar cliente**, antes de permitir a abertura da ficha de cadastro rápido.

## Fluxo ajustado
1. O operador pesquisa o cliente normalmente no PDV.
2. Quando a pesquisa possui 11 dígitos, o PDV trata a entrada como CPF e valida os dígitos verificadores.
3. Quando possui 14 dígitos, trata como CNPJ e valida os dígitos verificadores.
4. Se o documento estiver incorreto, a própria busca mostra **CPF inválido** ou **CNPJ inválido** e orienta a conferir os números.
5. Enquanto o documento estiver inválido, o botão **Cadastrar novo cliente** não é exibido.
6. Se o CPF/CNPJ for válido e não existir cliente cadastrado, o comportamento da v0.14.8 é mantido: aparece **Cadastrar novo cliente**, a ficha abre com o documento preenchido e, após salvar, o novo cliente é selecionado automaticamente no PDV.

## Regras de validação
- CPF: 11 dígitos, rejeição de sequências repetidas e conferência dos dois dígitos verificadores.
- CNPJ: 14 dígitos, rejeição de sequências repetidas e conferência dos dois dígitos verificadores.
- A validação acontece localmente na interface e não cria chamadas extras ao servidor.
- As validações já existentes no backend continuam ativas no momento do cadastro.

## Arquivo alterado
- `views/pdv.ejs`
  - funções de validação de CPF e CNPJ;
  - bloqueio do cadastro rápido para documento inválido;
  - mensagem visual específica para documento inválido nos temas Black OLED e Claro;
  - PDV atualizado para v0.14.9.

## Arquivo novo
- `Readme/CHANGELOG-PDV-CLIENTE-VALIDACAO-DOCUMENTO.md`

## Compatibilidade
Este pacote é incremental e deve ser aplicado sobre a entrega **PDV Cliente Rápido v0.14.8**. Não há alteração de rota, Service ou estrutura de dados nesta etapa.
