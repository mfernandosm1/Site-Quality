# Quality ERP v0.20.1 — Ativação ERP × Loja Virtual

## Objetivo

Separar o uso interno do produto no ERP da presença do produto no catálogo da Loja Virtual, mantendo a publicação como etapa manual e preservando os dados existentes.

## Estrutura de dados

- `erp.active`: controla a disponibilidade em novas operações internas.
- `virtualStore.active`: controla a participação no catálogo da Loja Virtual.
- `active`: permanece como espelho compatível de `virtualStore.active`, pois o publicador e o site atual já utilizam esse campo.
- `virtualStore.channels`: reserva a arquitetura dos canais Loja Virtual, Mercado Livre, Shopee, Amazon e Magalu. Apenas Loja Virtual é operacional nesta versão.

Produtos antigos, sem os novos objetos, herdam o valor de `active` para os dois contextos. Nenhuma migração destrutiva é executada.

## Regras implementadas

### ERP ativo

Disponível para novas operações no PDV e nos catálogos internos usados por Compras e Estoque.

### ERP inativo

Não aparece em novas operações. Histórico, estoque e registros já existentes permanecem preservados.

### Loja Virtual ativa

O produto integra o catálogo que será sincronizado quando o operador executar a publicação existente.

### Loja Virtual inativa

O produto continua no painel e no histórico, mas será removido do site na próxima publicação.

## Interface

- Cadastro com status independente para ERP e Loja Virtual.
- Listagem com colunas separadas `ERP` e `LV`.
- Alteração rápida diretamente na listagem, sem abrir o cadastro.
- Operações em lote independentes para ativar/desativar ERP e LV.
- Avisos explícitos de que alterações LV não publicam automaticamente.

## Publicação

O botão e o fluxo de publicação não foram alterados. O cadastro apenas grava o estado desejado; a sincronização continua exclusivamente manual.

## Compatibilidade

Foram mantidos espelhos dos campos legados (`active`, `sku`, `code`, `barcode`, `brand`) para evitar quebra nos serviços existentes enquanto o cadastro mestre evolui.

## Validação recomendada

1. Criar produto com ERP ativo e LV inativa.
2. Confirmar que aparece no PDV e Compras, mas não entra no site após publicar.
3. Ativar LV pela listagem, salvar e confirmar que o site não muda antes da publicação.
4. Publicar e confirmar a entrada no catálogo.
5. Desativar ERP e confirmar que o produto deixa de aparecer em novas operações, mantendo histórico e estoque.
6. Desativar LV, publicar e confirmar a remoção do catálogo público.
7. Repetir os testes nos modos Black OLED e claro.
