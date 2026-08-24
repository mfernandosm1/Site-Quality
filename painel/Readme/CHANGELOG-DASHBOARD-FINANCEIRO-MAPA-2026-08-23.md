# Ajustes — Dashboard, mapa de clientes e resumo financeiro — 23/08/2026

## Dashboard
- Card **Faturamento** recebeu identidade dourada/âmbar, mantendo Contas a Receber azul, Contas a Pagar vermelho e Contas Pagas verde.

## Localização dos clientes
- Removida a dependência de Leaflet/CDN + geocodificação externa que podia deixar o mapa como “indisponível”.
- A concentração por cidade continua carregando localmente e de forma leve somente ao expandir a seção.
- O mapa externo **não carrega automaticamente**: o usuário escolhe a cidade e clica em **Ver no mapa**.
- O mapa é carregado sob demanda em um iframe do Google Maps, sem chave de API, e há link para abrir o mapa completo em nova aba.
- Clicar em outra cidade da lista troca a seleção e permite carregar aquela localização.

## Financeiro — cards do topo
- Corrigido o cálculo de entradas realizadas: agora considera recebimentos de Venda/O.S. e também baixas efetivas de Contas a Receber.
- Corrigido o cálculo de saídas realizadas: pagamentos estornados deixam de inflar o total de saídas.
- Estornos de venda/recebimento reduzem entradas; estornos de pagamento reduzem saídas.
- Suprimento e sangria continuam fora dos indicadores operacionais, conforme a regra já adotada no módulo financeiro.

### Conferência com a base recebida
Na base do ZIP utilizado, agosto/2026 passa a conciliar:
- Entradas realizadas: R$ 25.816,35 (R$ 25.185,99 de venda/O.S. + R$ 630,36 de recebimentos).
- Saídas realizadas: R$ 18.671,45 (R$ 18.895,01 registrados menos R$ 223,56 de pagamentos estornados).
- Saldo operacional líquido: R$ 7.144,90.
