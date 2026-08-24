# Quality ERP v0.24.0.8 — Fechamento e congelamento do módulo Clientes

## Ajustes concluídos

- Código do cliente exibido sem zeros à esquerda. O valor interno foi preservado para manter compatibilidade com registros e integrações existentes.
- Seleção individual e seleção de todos os clientes visíveis.
- Ação em lote **Inativar selecionados**, preservando histórico e vínculos.
- Identificação do cliente no PDV no padrão **Nome - CPF/CNPJ**.
- Estornos de recebimentos passam a informar também a venda ou O.S. de origem no Caixa, evitando confusão entre recebimentos antigos e a operação atual.
- Revisão do caso reportado de R$ 1,16: o movimento pertencia ao recebimento antigo nº 000002, título nº 000003, e não à venda nova de R$ 1,00. O cálculo do estorno continua usando exatamente o valor efetivamente recebido.

## Congelamento funcional

O módulo Clientes passa a ser considerado estável para a migração do WM10. A partir desta versão:

- não alterar estrutura de cadastro sem necessidade comprovada;
- não renumerar IDs ou códigos armazenados;
- aceitar somente correções de bugs, compatibilidade e segurança;
- novas funções devem ser avaliadas após a importação e uso real da base.

## Teste rápido

1. Abrir Clientes e confirmar código `1` em vez de `000001`.
2. Selecionar dois clientes e clicar em **Inativar selecionados**.
3. Confirmar que ficam inativos, mas continuam no histórico.
4. Abrir o PDV e conferir `Nome - CPF/CNPJ` na seleção.
5. Fazer venda de R$ 1,00 no crediário, receber R$ 1,00 e estornar a operação.
6. No Caixa, confirmar estorno de R$ 1,00 com referência à venda correta e horário do momento do estorno.
