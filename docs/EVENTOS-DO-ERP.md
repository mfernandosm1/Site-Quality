# Eventos do ERP

## Regra
Eventos representam fatos concluídos. Devem usar nomes estáveis em maiúsculas e no passado lógico, sem depender da interface.

## Catálogo inicial
`SYSTEM_STARTED`, `SYSTEM_SHUTDOWN`, `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `SUPPLIER_CREATED`, `SUPPLIER_UPDATED`, `SALE_STARTED`, `SALE_COMPLETED`, `SALE_CANCELLED`, `CASHBOX_OPENED`, `CASHBOX_CLOSED`, `STOCK_MOVED`.

## Integração
Nesta versão apenas eventos do sistema são publicados automaticamente. Eventos operacionais serão conectados gradualmente após testes de cada módulo.
