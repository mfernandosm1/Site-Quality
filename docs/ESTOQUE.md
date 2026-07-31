# ERP — Estoque

## Objetivo

Controlar saldo e movimentações de forma confiável, mantendo histórico e preparando a integração com Compras, PDV, Site e Financeiro.

## Regras centrais

- Produto é o cadastro mestre.
- Variação ou combinação é a unidade comercial e de estoque quando aplicável.
- Saldo muda somente por movimentação.
- Movimentações são imutáveis.
- Erros devem ser corrigidos por ajuste ou estorno, nunca apagando histórico.
- Controle é ativado individualmente por produto.
- Estoque negativo permanece sujeito à política configurada.

## Arquivos de dados

```text
data/erp/inventory/
├── stock.json
├── movements.json
├── locations.json
└── inventory-settings.json
```

Esses arquivos contêm dados reais e não devem ser substituídos por pacotes de atualização.

## Serviço

`InventoryService` concentra as regras de estoque. Rotas e telas devem utilizar o serviço em vez de alterar JSON diretamente.

Principais responsabilidades já previstas ou implementadas:

- configurar item;
- consultar saldo;
- registrar entrada;
- registrar saída;
- ajustar estoque;
- reservar e liberar;
- estornar movimentação;
- listar histórico.

## Integração com Produtos

O produto contém referência estável ao item do estoque e políticas como:

```text
inventory.itemId
inventory.stockControlled
inventory.allowNegative
inventory.minimumQuantity
```

O saldo real deve vir do estoque. Campos antigos no catálogo são mantidos apenas quando necessários como espelho temporário de compatibilidade.

## Linha de versões

### v0.11.0

Fundação técnica, arquivos de dados, migração e integração inicial com Produtos.

### v0.11.1

Correção do caminho de gravação e instância única do serviço.

### v0.11.5

Tela operacional com dashboard, filtros, painel lateral, entrada, saída, ajuste e histórico.

### v0.11.6

**Em validação.** Atalhos de quantidade, motivos rápidos, motivo manual editável, recentes e histórico aprimorado.

## Motivos rápidos

Os motivos rápidos funcionam como pequenos botões que preenchem o campo de motivo. O operador pode manter, complementar ou substituir o texto manualmente.

Exemplos:

- Compra;
- Venda;
- Troca;
- Devolução;
- Inventário;
- Correção;
- Perda.

No futuro, a lista poderá ser configurável em Configurações → Estoque.

## Teste mínimo da v0.11.6

1. fazer backup da pasta do projeto;
2. não substituir `stock.json` nem `movements.json`;
3. abrir um produto controlado;
4. registrar entrada usando quantidade rápida;
5. clicar em um motivo rápido e complementar o texto;
6. confirmar saldo anterior, movimentação e saldo resultante;
7. reiniciar o painel e verificar persistência;
8. testar saída sem permitir saldo inválido quando a política bloquear negativo.

## Próximas melhorias recomendadas

- quantidade ideal;
- necessidade de compra calculada;
- alerta de estoque mínimo ou zerado;
- motivo configurável;
- operador autenticado no histórico;
- integração formal com Compras;
- integração formal com PDV;
- inventário por contagem e divergência.
