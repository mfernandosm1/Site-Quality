# Quality ERP v0.25.1.7 — Paginação da Central do Cliente

## Motivo

Após a importação WM10, o arquivo `customers.json` passou a conter 2.971 clientes. A tela anterior montava todos os registros e todos os resumos financeiros em uma única requisição, bloqueando o processo Node.

## Alterações

- Paginação no servidor com 50 clientes por página.
- Pesquisa por nome, cidade, código, telefone, CPF/CNPJ ou e-mail no servidor.
- Filtros de situação, pessoa, classificação e cadastro no servidor.
- Resumo financeiro calculado somente para os clientes da página atual.
- Indicador `Exibindo 1–50 de 2.971` e navegação entre páginas.
- Seleção em lote limitada aos clientes exibidos na página atual.
- Preservação dos filtros ao avançar ou voltar páginas.

## Dados preservados

Nenhum cliente é alterado por esta versão. Não é necessário repetir a importação WM10.
