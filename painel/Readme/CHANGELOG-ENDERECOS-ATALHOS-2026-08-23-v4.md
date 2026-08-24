# Ajustes — atalhos do menu e endereço inteligente — 23/08/2026

## Atalhos do menu
- Corrigido o caso em que itens desmarcados continuavam aparecendo no menu.
- A seleção salva em `quality_global_menu_shortcuts` agora é aplicada também via `display:none`, além do atributo `hidden`.
- Adicionada proteção CSS específica para garantir que apenas os atalhos marcados sejam exibidos.

## Endereço / bairro
- A busca por endereço agora consulta também os endereços já cadastrados no próprio Quality ERP.
- Busca parcial ficou mais tolerante: `rua pre` pode localizar `Rua Prestes Guimarães` sem exigir o nome completo.
- Quando um endereço já conhecido possui bairro, a sugestão leva o bairro junto e o campo Bairro é preenchido automaticamente ao selecionar.
- Mantido o filtro por cidade/UF e, quando informado, por CEP; não mistura endereço cadastrado de outro CEP.
- Mantidas ViaCEP e OpenStreetMap como complemento/fallback.
- Após selecionar uma sugestão, a lista é fechada antes de avançar ao campo Número, evitando reaparecimento sobre o formulário.
