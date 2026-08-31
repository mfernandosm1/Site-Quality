# Analytics — aviso único após zerar

- Removida a segunda renderização local da mensagem `flash` em `analytics.ejs`.
- O Analytics passa a usar somente a notificação global do layout (`data-auto-flash`).
- A notificação única desaparece automaticamente após 3 segundos e o parâmetro `flash` é removido da URL pelo layout.
- Nenhuma regra de coleta, zeragem ou leitura do Analytics foi alterada.
