# Quality ERP v0.22.1 — Ajustes de LV e Estorno de Compras

## Cadastro de produtos
- Produtos novos começam com a Loja Virtual (LV) inativa.
- A ativação da LV ocorre apenas por seleção explícita do usuário.
- Produtos já cadastrados mantêm o status atual.

## Estorno de compras
- Mantida a proteção que impede estornar, pelo Financeiro, uma conta originada em Compra.
- O módulo Compras agora autoriza internamente a reversão coordenada da conta a pagar.
- Pagamentos imediatos vinculados também são estornados.
- Após a reversão financeira, os movimentos de estoque da compra são retirados e a compra passa para Estornada.
