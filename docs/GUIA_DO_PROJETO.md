# Guia Oficial do Projeto

## Filosofia

- estabilidade acima de novidades;
- melhorias incrementais em vez de grandes reescritas;
- simplicidade operacional;
- backup antes de alterações importantes;
- documentação junto com o código;
- preservar compatibilidade;
- reduzir tempo e custo da operação da loja.

## Prioridade de trabalho

1. correções de bugs;
2. experiência do usuário;
3. experiência do operador;
4. SEO;
5. Analytics;
6. novas funcionalidades;
7. refatoração e limpeza.

## Regras de desenvolvimento

- confirmar o arquivo real antes de editar;
- preferir correções direcionadas;
- reconsiderar propostas que alterem cinco ou mais arquivos centrais;
- nunca remover funcionalidades estáveis sem necessidade clara;
- evitar dependências front-end pesadas;
- preservar a estrutura dos JSONs existentes;
- regras críticas não podem existir somente no front-end;
- entidades centrais não podem ser duplicadas por módulo;
- IDs devem ser estáveis e independentes do nome visível;
- alterações de estoque devem ocorrer por movimentação, não por sobrescrita silenciosa;
- dados internos, como custo e fornecedor, não devem ser enviados ao site público.

## Fluxo obrigatório

1. entender o problema;
2. mapear impacto e integração;
3. fazer backup quando houver risco;
4. implementar a menor alteração segura;
5. testar o cenário principal e regressões básicas;
6. documentar o resultado;
7. publicar somente após validação.

## Regras específicas já definidas

- o site público permanece estático por escolha de velocidade, SEO e simplicidade;
- o painel gera conteúdo e publica o site;
- `products.json` é um arquivo de alto risco e afeta diversos módulos;
- alterações de tema devem preferir `theme-overrides.css` ou o CSS central do painel, evitando mexer no legado sem necessidade;
- `sorteios.js` não deve ser removido ou reescrito casualmente;
- o preço pode ser ocultado no site conforme a configuração comercial;
- o ERP deverá substituir gradualmente sistemas pagos, sem pressa e sem comprometer estabilidade.
