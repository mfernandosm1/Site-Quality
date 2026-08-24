# Cadastro de fornecedor dentro da operação

## Escopo
Disponível em **Compras** e **Contas a Pagar** pela opção **+ Cadastrar novo fornecedor**.

## Fluxo
- O cadastro usa a rota oficial de Fornecedores (`POST /erp/fornecedores`), sem criar base paralela.
- Ao entrar no cadastro rápido, o modal da operação atual (Compra ou Conta a Pagar) é temporariamente ocultado. Assim, o usuário visualiza somente o cadastro do fornecedor.
- Ao **Cadastrar e selecionar**, o fornecedor é criado, incluído nas listas sem F5, selecionado automaticamente e a tela da Compra/Conta a Pagar volta exatamente com os dados já preenchidos.
- Ao **Cancelar**, clicar no **X** ou no fundo do cadastro, nenhum fornecedor é criado e a tela anterior volta preservada.
- CPF/CNPJ, e-mail e duplicidade continuam validados pelo cadastro mestre.

## Correção de empilhamento de modais
O cadastro rápido recebeu camada visual superior de segurança e, principalmente, deixou de permanecer simultaneamente visível com o modal da operação. Isso evita o efeito de “cadastro atrás da compra/conta”.
