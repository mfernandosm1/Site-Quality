# Clientes ERP v0.12.3 — Consulta automática de CNPJ

## Arquivos

- `services/company-lookup-service.js` — serviço reutilizável de consulta.
- `services/customer-service.js` — persistência dos novos campos de pessoa jurídica.
- `routes/erp.js` — rota interna `GET /erp/clientes/consulta-cnpj/:cnpj`.
- `views/clientes.ejs` — campos empresariais e indicação visual.
- `public/js/clientes.js` — consulta automática, preenchimento e proteção contra sobrescrita.

## Funcionamento

1. Selecione **Pessoa jurídica**.
2. Digite um CNPJ válido.
3. O navegador chama a rota interna do Painel Quality.
4. O servidor consulta a BrasilAPI.
5. Os campos vazios são preenchidos automaticamente.
6. Se algum campo já contiver informação diferente, o sistema pergunta antes de substituir.

## Dados preenchidos quando disponíveis

- Razão social
- Nome fantasia
- Situação cadastral
- Data de abertura
- Natureza jurídica
- Porte
- CNAE principal
- E-mail e telefone
- CEP e endereço completo

## Segurança e estabilidade

- A consulta externa ocorre pelo servidor.
- Existe timeout de 10 segundos.
- Uma falha na API não bloqueia o cadastro manual.
- O CNPJ continua sendo validado no navegador e no servidor.
- O serviço foi isolado para futuro reuso em Fornecedores, Empresas e Filiais.

## Instalação

Copie cada arquivo para a pasta equivalente dentro de `C:\Site\painel`.

Antes de substituir, faça backup dos arquivos atuais.
