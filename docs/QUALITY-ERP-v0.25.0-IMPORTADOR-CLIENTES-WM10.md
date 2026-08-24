# Quality ERP v0.25.0 — Importador de Clientes WM10

## Estado do módulo Clientes
O módulo Clientes está funcionalmente congelado. Alterações futuras devem se limitar a correções de bugs, segurança e compatibilidade.

## Fluxo seguro
1. Acesse **ERP → Clientes → Importar WM10**.
2. Configure URL, CNPJ e token. O token é salvo somente na base local e não aparece novamente na tela.
3. Clique em **Consultar e simular**. Nenhum dado é gravado.
4. Revise novos, atualizações, ignorados, avisos e conflitos.
5. A importação só é liberada quando não existem conflitos.
6. Antes de gravar, o sistema cria backup de `customers.json` em `data/erp/customers/backups`.

## Códigos ignorados
`2`, `755`, `759` e `760`.

## Vínculo e duplicidade
A prioridade de vínculo é o código original WM10. Na ausência dele, usa CPF/CNPJ válido. O código interno do Quality ERP não é substituído.

## Aniversariantes
A data de nascimento e o celular/WhatsApp são importados para permitir que a Automação WhatsApp consulte futuramente a própria base do ERP.
