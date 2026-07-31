# Clientes ERP v0.12.4 — Pessoa Física Inteligente

## Arquivos alterados

- `views/clientes.ejs`
- `public/js/clientes.js`

## Melhorias

- CPF mantém máscara e validação matemática.
- CPF válido é comparado imediatamente com os clientes já carregados no Cadastro Mestre.
- Quando já existir, o painel mostra nome, código e botão **Abrir cliente**.
- Quando não existir, exibe **CPF válido e ainda não cadastrado**.
- Após sair de um CPF válido e novo, o foco segue para **Nome / Razão social**.
- A data de nascimento calcula a idade automaticamente.
- A idade é apenas exibida; não é gravada, evitando informação desatualizada.
- Pessoa Jurídica e consulta automática de CNPJ permanecem preservadas.
- A validação final e a proteção contra duplicidade no servidor continuam funcionando.

## Instalação

Substitua:

- `C:\Site\painel\views\clientes.ejs`
- `C:\Site\painel\public\js\clientes.js`

Depois reinicie o painel e atualize a página com `Ctrl + F5`.
