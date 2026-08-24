# Quality ERP — Endereços e atalhos — 23/08/2026

## Ajustes desta revisão

### Endereço inteligente no cadastro
- O campo visual **Rua** foi renomeado para **Endereço** nos cadastros de clientes, fornecedores e cliente rápido do PDV.
- A alteração também foi aplicada às definições configuráveis de campos de clientes e fornecedores, inclusive migrando o rótulo padrão antigo `Rua` para `Endereço`.
- Após consultar um CEP, o foco agora vai para **Endereço** em vez de pular diretamente para **Número**.
- Fornecedores passam a consultar automaticamente o CEP ao completar os 8 dígitos, mantendo o botão manual disponível.

### Sugestões de endereço por cidade
- Ao digitar pelo menos 3 caracteres no campo **Endereço**, com cidade e UF já preenchidas, o ERP consulta sugestões de logradouros da cidade.
- A lista é exibida em um dropdown próprio do Quality ERP, compatível com Claro, Escuro, Black OLED e Dark Blue.
- Ao escolher uma sugestão, o ERP preenche endereço e bairro e avança para o número.
- A digitação manual continua sempre liberada para estradas, linhas, travessas ou endereços que não estejam na base consultada.
- A consulta usa debounce no navegador, cache no navegador e cache temporário no servidor para evitar chamadas repetidas e manter o cadastro leve.
- A chamada externa foi centralizada no backend (`/erp/endereco/sugestoes`) para evitar depender de requisições diretas do navegador ao serviço externo.

### Atalhos
- O item **Personalizar atalhos** do menu agora deixa explícito que personaliza os atalhos da **Dashboard/página inicial**.
- O botão da Dashboard também passou a exibir `Personalizar atalhos`.

## Arquivos alterados
- `routes/erp.js`
- `services/customer-service.js`
- `services/supplier-service.js`
- `public/js/address-autocomplete.js`
- `public/js/clientes.js`
- `public/js/fornecedores.js`
- `public/js/inline-supplier-create.js`
- `public/css/painel.css`
- `views/clientes.ejs`
- `views/fornecedores.ejs`
- `views/pdv.ejs`
- `views/layout.ejs`
- `views/index.ejs`
