# Changelog — Endereços + enquadramento da logo — 23/08/2026

## Endereços
- Busca por CEP agora usa o CEP como referência autoritativa para cidade/UF.
- CEP informado mantém filtro estrito: cadastros locais com outro CEP (ou CEP desconhecido) não entram nas sugestões.
- CEPs gerais de cidade passam a aproveitar melhor a base já existente do Quality ERP (clientes + fornecedores).
- Digitar apenas o tipo de via, como `rua`, `avenida` ou `travessa`, lista vias já conhecidas daquela cidade/CEP quando houver dados locais.
- Busca parcial mais tolerante para casos como `rua pre`.
- Sugestões locais são ordenadas também pela frequência de uso, priorizando endereços mais recorrentes.
- Bairro é reaproveitado automaticamente quando já existe em um cadastro conhecido para a mesma via/CEP.
- Após selecionar uma sugestão sem bairro, o front faz uma consulta complementar silenciosa para tentar completar o bairro sem bloquear o cadastro.
- Continua permitido digitar qualquer endereço manualmente quando nenhuma fonte reconhece a via.

## Logo da empresa
- Adicionado editor de enquadramento antes de salvar a logo.
- Aceita imagens em proporções variadas e gera a versão final já recortada para o cabeçalho.
- Controles: zoom, posição horizontal, posição vertical, arrastar com mouse/toque, mostrar imagem inteira e preencher quadro.
- É possível reenquadrar a logo já salva sem precisar localizar novamente o arquivo original.
- A imagem final é salva em PNG, com a proporção adequada à barra superior.
- Limite de upload de origem ampliado para 8 MB; o arquivo efetivamente salvo é a versão processada pelo editor.

## Arquivos alterados
- `routes/erp.js`
- `public/js/address-autocomplete.js`
- `routes/configuracoes.js`
- `views/configuracoes.ejs`
- `public/css/painel.css`
- `public/js/company-logo-editor.js` (novo)
