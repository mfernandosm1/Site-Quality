# Quality ERP — correção v0.27.5

Correção textual no bloco **ATENÇÃO NECESSÁRIA** da Dashboard.

Antes, a montagem automática do plural podia gerar **"2 contagemens de estoque em andamento"**.

Agora o texto usa as formas corretas:

- `1 contagem de estoque em andamento`
- `2 contagens de estoque em andamento`
- `N contagens de estoque em andamento`

Arquivo alterado:

- `services/dashboard-service.js`
