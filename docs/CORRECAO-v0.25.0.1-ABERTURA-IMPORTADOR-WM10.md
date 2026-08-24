# Quality ERP v0.25.0.1 — Correção da abertura do Importador WM10

## Correção
A variável local `settings` enviada à view sobrescrevia o objeto interno `settings` utilizado pelo Express/ejs-mate. Com isso, o mecanismo de layout não encontrava `settings.views` e gerava `ERR_INVALID_ARG_TYPE` ao abrir a tela.

A variável da configuração WM10 foi renomeada para `wm10Settings`, sem alteração nos dados salvos nem no funcionamento do importador.

## Teste rápido
1. Reiniciar o painel.
2. Abrir ERP → Clientes.
3. Clicar em `Importar WM10`.
4. Confirmar que a tela abre normalmente.
5. Salvar a configuração e executar apenas `Consultar e simular`.
