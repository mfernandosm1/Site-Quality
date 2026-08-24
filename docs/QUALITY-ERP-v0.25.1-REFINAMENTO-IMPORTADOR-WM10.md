# Quality ERP v0.25.1 — Refinamento do Importador WM10

## Ajustes

- Leitura da resposta da API com detecção entre UTF-8 e Windows-1252 para preservar caracteres acentuados.
- Simulação exibindo código WM10, nome, CPF/CNPJ, cidade/UF e resultado.
- Pesquisa local por nome, CPF/CNPJ ou cidade.
- Indicadores de ativos, inativos, pessoa física e pessoa jurídica.
- Nenhuma alteração na lógica de backup, paginação ou confirmação da importação.

## Segurança

A simulação continua sem gravar clientes. A importação definitiva só ocorre após confirmação explícita e criação do backup da base.
