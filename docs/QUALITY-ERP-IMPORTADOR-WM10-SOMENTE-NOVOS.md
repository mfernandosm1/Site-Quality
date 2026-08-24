# Quality ERP — Importador WM10 somente para novos clientes

## Objetivo

Tornar a reimportação incremental do WM10 segura durante a migração, permitindo buscar novos cadastros sem regravar ou sobrescrever clientes que já existem no Quality ERP.

## Comportamento implementado

- O modo permitido na execução agora é `new-only`.
- A simulação continua comparando toda a base para identificar novos, existentes, ignorados, avisos e conflitos.
- Os registros antes exibidos como “Atualizações” agora aparecem como “Existentes preservados”.
- A execução cria somente os clientes presentes na lista de novos.
- Nenhum cliente existente passa pelo método de atualização.
- O servidor rejeita qualquer modo de execução diferente de `new-only`.
- A tela envia os códigos dos novos clientes encontrados na simulação.
- Antes de gravar, o servidor consulta o WM10 novamente e compara a lista atual com a lista simulada. Se houver diferença, a importação é bloqueada e exige nova simulação.
- Um backup do arquivo de clientes continua sendo criado antes da gravação.
- Quando não houver clientes novos, o botão permanece desabilitado.
- O relatório final informa quantos novos foram importados e quantos existentes foram preservados.

## Caso de teste atual

1. Abrir `ERP > Clientes > Importar WM10`.
2. Clicar em `Consultar e simular`.
3. Confirmar que aparecem 2 em “Novos para importar”.
4. Confirmar que os demais aparecem em “Existentes preservados”.
5. Clicar em `Importar 2 novo(s) cliente(s)`.
6. Conferir que o resultado mostra:
   - Novos importados: 2;
   - Atualizados: 0;
   - Erros: 0.
7. Abrir a lista de clientes e localizar os dois novos cadastros.
8. Rodar a simulação novamente. O resultado esperado é 0 novos e o botão desabilitado.

## Arquivos alterados

- `services/wm10-customer-import-service.js`
  - Adicionado `importNewOnly`.
  - Removido da execução o laço de atualização dos clientes existentes.
  - Adicionada validação da lista de códigos simulados.
  - Mantido `importAll` apenas como compatibilidade, delegando para o modo seguro.

- `routes/erp.js`
  - A rota de execução aceita somente o modo `new-only`.
  - Envia os códigos esperados para validação no serviço.
  - Retorna mensagem explícita de preservação dos existentes.

- `views/clientes_importar_wm10.ejs`
  - Interface atualizada para deixar claro que somente novos serão importados.
  - “Atualizações” renomeado para “Existentes preservados”.
  - Botão mostra a quantidade exata de novos.
  - Confirmação informa que os existentes não serão alterados.
  - Resultado final mostra novos importados, existentes preservados, atualizados e erros.

## Observação de arquitetura

O importador WM10 deve permanecer isolado como ferramenta de migração. A regra padrão é incremental e idempotente: executar novamente não deve duplicar nem modificar cadastros já incorporados ao Quality ERP.
