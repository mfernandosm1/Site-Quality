# Fluxo de Caixa — revisão 2

## Alterações

1. Removido o card **Saldo do período**, pois no modo padrão “Realizado” ele repetia, na prática, o mesmo resultado operacional apresentado em **Saldo atual** quando não havia saldo anterior.
2. O filtro **Situação** agora abre em **Realizado** por padrão, tanto na página quanto no service/API quando o parâmetro `mode` não é informado.
3. As opções do filtro **Origem** e os textos da linha do tempo foram traduzidos para português:
   - `manual` → Manual
   - `payable payment` / `payable_payment` → Pagamento de conta a pagar
   - `purchase` → Compra
   - `service order` / `service_order` → Ordem de serviço
   - demais origens recebem uma formatação legível automática.

## Arquivos alterados

- `routes/erp.js`
- `services/cash-flow-service.js`
- `views/fluxo_caixa.ejs`

## Instalação

Copie os arquivos preservando as pastas, substitua os existentes, reinicie o servidor e atualize o navegador com `Ctrl+F5`.
