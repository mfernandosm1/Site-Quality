# Quality ERP v0.23.1 — Cadastro Financeiro de Clientes

## Objetivo

Evoluir o Cadastro Mestre para concentrar dados pessoais, configuração visual dos campos e a relação financeira do cliente com o Contas a Receber e o crediário do PDV.

## Alterações

- O nome exibido de cada campo pode ser editado em Configurações → Cadastro de Clientes.
- O identificador interno do campo permanece imutável para preservar integrações.
- Novos campos: Limite de crédito, Renda mensal, Profissão, Cônjuge, Nome do pai e Nome da mãe.
- Os campos pessoais são configuráveis em ativo, obrigatório, ordem e nome exibido.
- A lista de clientes ganhou o menu Gerenciar.
- O menu oferece acesso a detalhes/edição, nova venda, Contas a Receber e resumo financeiro.
- O resumo financeiro usa o Contas a Receber como fonte oficial.
- O limite de crédito é validado somente nas formas que geram Contas a Receber/crediário.
- Limite igual a zero significa “não configurado” e não bloqueia a venda.
- Quando houver limite configurado, o disponível é: limite menos saldo aberto.

## Proteções

- Nenhum saldo financeiro paralelo foi criado no cadastro do cliente.
- Pix, dinheiro, débito e pagamentos liquidados imediatamente não consomem limite.
- CPF/CNPJ e Nome/Razão social continuam com as validações existentes.
- Ocultar um campo não apaga os dados já gravados.
- O nome interno de cada campo não pode ser editado.

## Arquivos alterados

- services/customer-service.js
- routes/erp.js
- views/clientes.ejs
- views/configuracoes_clientes.ejs
- public/js/clientes.js

## Arquivo novo

- docs/QUALITY_ERP_v0.23.1_CADASTRO_FINANCEIRO_CLIENTES.md

## Testes recomendados

1. Alterar o nome exibido de um campo e confirmar o novo rótulo no cadastro.
2. Reordenar e ocultar campos, salvar e reabrir Clientes.
3. Cadastrar e editar os novos campos pessoais.
4. Definir limite de crédito para um cliente.
5. Abrir o resumo financeiro e comparar com Contas a Receber.
6. Finalizar venda no crediário abaixo do limite.
7. Tentar finalizar venda acima do limite e confirmar o bloqueio.
8. Finalizar Pix/dinheiro para o mesmo cliente e confirmar que o limite não interfere.
9. Conferir menu Gerenciar nos temas Claro e Black OLED.

## Compatibilidade

Preservados PDV, Caixa, Estoque, Compras, Contas a Pagar, Contas a Receber, Centro de Operações e clientes existentes.

## Correção complementar — Menu Gerenciar na lista de clientes

- O menu passou a usar posicionamento fixo em relação à janela, deixando de ser recortado pelo contêiner rolável da tabela.
- A posição é calculada a partir do botão Gerenciar e ajustada aos limites da tela.
- Quando não há espaço abaixo, o menu abre automaticamente para cima.
- O posicionamento é recalculado durante rolagem e redimensionamento.
- Mantidos o fechamento ao clicar fora, ao abrir outro menu e ao pressionar Esc.
- Nenhuma rota, regra financeira ou dado de cliente foi alterado.
