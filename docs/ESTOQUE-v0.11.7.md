# Painel Quality ERP — Estoque v0.11.7

## Entrega
Inteligência de movimentações de estoque.

## Alterações
- Novos movimentos recebem `reasonCode` e `classification`.
- Motivos rápidos:
  - PURCHASE / purchase
  - SALE / sale
  - GIFT / gift
  - RETURN / return
  - WARRANTY / warranty
  - INVENTORY / inventory
  - LOSS / loss
  - INTERNAL / internal
- Motivos digitados manualmente ficam como `CUSTOM / custom`.
- IDs novos seguem o formato `MOV-AAAAMMDD-000001`.
- Histórico antigo permanece compatível e não é regravado.
- Incluído método `listarMovimentacoesPorClassificacao` para relatórios futuros.
- Armazenamento local de motivos recentes migra automaticamente do formato texto para objeto.

## Arquivos
- `services/inventory-service.js`
- `routes/erp.js`
- `views/estoque.ejs`
- `public/js/estoque.js`

## Instalação
1. Faça backup dos quatro arquivos atuais.
2. Substitua pelos arquivos deste pacote nas mesmas pastas.
3. Reinicie o Painel Quality.
4. Registre uma entrada/saída usando um motivo rápido.
5. Confira em `data/erp/inventory/movements.json` os campos `reasonCode` e `classification`.

## Teste recomendado
Registre uma saída com “Venda”. O movimento deve conter:
```json
{
  "reason": "Venda em balcão",
  "reasonCode": "SALE",
  "classification": "sale"
}
```

## Observação
Os movimentos antigos continuam sem os novos campos. Isso é intencional para preservar o histórico original.
