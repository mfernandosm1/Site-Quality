# Quality ERP V1.7.8 — Preço da variação no próprio grupo

## Correção
Quando existe apenas um grupo de variação (ex.: **Tipo de serviço**), o campo **Preço ERP** agora aparece diretamente ao lado de cada opção desse grupo.

Exemplo:
- Formatação sem cópia de dados — Preço ERP: R$ 100,00
- Formatação com cópia de dados — Preço ERP: R$ 160,00

A **Grade de combinações** fica escondida nesse cenário, pois não faz sentido obrigar o usuário a editar uma combinação quando a própria opção já representa a variação vendável.

Internamente a combinação continua existindo para preservar compatibilidade com PDV, identidade da variação e estoque quando aplicável.

Se houver dois ou mais grupos simultâneos (ex.: Cor + Armazenamento), a Grade de combinações continua aparecendo normalmente.

## Arquivo alterado
- `views/produtos.ejs`

## Base
Este patch parte da V1.7.7 e mantém o suporte de preço ERP individual por combinação já implementado.
