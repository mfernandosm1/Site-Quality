# Ajuste — parcelas no recebimento

- O campo Parcelas agora respeita a configuração da forma de pagamento (`allowInstallments` e `maxInstallments`).
- Ex.: Cartão de crédito configurado para máximo 18x exibe somente 1x a 18x.
- Formas sem parcelamento permanecem em 1x e ocultam o campo.
- O backend valida o máximo configurado para evitar gravação acima do permitido.
- A quantidade de parcelas informa como o recebimento foi pago no cartão/forma selecionada; a baixa financeira continua integral na data do recebimento para o valor efetivamente recebido.
