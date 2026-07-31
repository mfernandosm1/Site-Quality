# Quality ERP v0.18.3 — Refinamento Operacional do Contas a Pagar

## Implantação

Evolução incremental sobre a v0.18.2, sem reescrita do módulo e preservando os serviços de pagamentos, Financeiro e Fluxo de Caixa já existentes.

## Ajustes implantados

- A ação **Cancelar conta** foi renomeada para **Estornar conta**.
- O estorno possui modal próprio com motivo opcional.
- Contas estornadas usam o estado `reversed`; a rota antiga `/cancelar` foi mantida como compatibilidade.
- O selo **Principal** foi reposicionado para não sobrepor o campo da competência.
- Cada competência agora possui:
  - mês/ano;
  - valor próprio;
  - vencimento próprio.
- Ao adicionar uma competência, o sistema copia automaticamente o valor da anterior e avança um mês no vencimento.
- O valor informado no topo funciona como valor por competência e é replicado nas linhas existentes.
- O total da despesa é calculado pela soma das competências.
- Cada competência gera uma parcela independente, permitindo pagar somente uma delas ou registrar pagamento parcial.
- Pagamentos continuam sendo enviados aos serviços Financeiro e Fluxo de Caixa já utilizados pelo módulo.

## Compatibilidade

- Registros antigos, sem `competenceItems`, continuam sendo criados pelo fluxo legado de parcelamento do serviço.
- A rota antiga de cancelamento foi preservada e internamente executa estorno.
- Nenhuma migração obrigatória dos JSON existentes foi adicionada.

## Ideia futura registrada

Permitir editar o valor total ou somente uma parcela após o cadastro, com recálculo seguro dos saldos e trilha de auditoria. Essa evolução deve bloquear alterações incompatíveis com pagamentos já lançados ou gerar movimentos compensatórios no Financeiro/Fluxo de Caixa.
