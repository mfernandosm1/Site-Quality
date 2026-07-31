# Painel Quality ERP v0.13.0 — Fundação PDV

## Entrega
- PDV integrado ao router ERP existente.
- Venda e Ordem de Serviço na mesma tela.
- Cliente cadastrado ou identificador rápido.
- Vendedor principal e vendedor por item.
- Produtos integrados ao cadastro mestre.
- Pagamentos sem limite fixo.
- Cálculo de total pago, pendente e troco.
- Operações em aberto com busca e alternância.
- Caixa obrigatório para finalização.
- Abertura, fechamento, suprimento, sangria e despesa.
- Baixa de estoque na finalização.
- Movimentação de caixa por pagamento recebido.
- Estrutura de dados separada em `data/erp/commerce`.

## Limites desta fundação
- O cadastro visual de múltiplos caixas ainda não foi incluído; o serviço já aceita múltiplos registros.
- Funcionários e regras de comissão ainda não possuem cadastro próprio; os nomes são armazenados por operação e item.
- Recebimentos posteriores de vendas com saldo pendente serão tratados na evolução financeira.
- A O.S. inclui os campos operacionais iniciais, mas ainda não é o módulo técnico completo.
