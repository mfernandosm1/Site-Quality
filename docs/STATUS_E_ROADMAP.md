# Status e Roadmap

## Legenda

- **Estável:** testado e em uso.
- **Em validação:** entregue, aguardando teste real ou refinamento.
- **Planejado:** ainda não implementado.

## Situação por área

| Área | Situação | Observação |
|---|---|---|
| Site público | Estável | GitHub Pages e domínio próprio |
| Publicação | Estável | backup, sincronização, commit e push |
| Analytics | Estável | Apps Script, Sheets e painel local |
| WhatsApp / Inbox | Estável com evolução | Provider, mídias, CRM e Comercial |
| Calculadora Comercial | Estável com evolução | Excel, listas coladas e orçamento manual |
| Orçamentos salvos | Em validação/evolução | busca simples por cliente |
| Cadastro Mestre de Produtos | Estável com evolução | categorias, subcategorias e integração com site |
| Compatibilidade | Em evolução | capas e películas dentro de Ferramentas |
| ERP Fundação | Estável | arquitetura e navegação base |
| Estoque v0.11.0–v0.11.5 | Estável após testes | fundação, sincronização e operação manual |
| Estoque v0.11.6 | Em validação | atalhos de quantidade e motivos rápidos |
| Compras | Planejado | desenhar integração antes do código |
| Clientes ERP | Planejado | unificar CRM/WhatsApp/ERP |
| PDV | Planejado | depende de Produtos e Estoque |
| Financeiro / Caixa | Planejado | recebe efeitos de compras e vendas |
| DRE / DFC | Planejado | fase posterior |

## Sequência recomendada

### Fase atual — Estoque

- validar v0.11.6;
- quantidade ideal;
- alertas de reposição;
- filtros e histórico operacional;
- preparar pontos de integração com Compras e PDV.

### Próxima fase — Compras

Antes da interface:

- definir fornecedor;
- pedido de compra;
- recebimento parcial ou total;
- custo;
- entrada no estoque;
- contas a pagar;
- cancelamento e estorno.

### Depois

1. Clientes unificados;
2. PDV;
3. Financeiro e Fluxo de Caixa;
4. Ordens de Serviço;
5. DRE e DFC;
6. permissões, auditoria completa e multiusuário.
