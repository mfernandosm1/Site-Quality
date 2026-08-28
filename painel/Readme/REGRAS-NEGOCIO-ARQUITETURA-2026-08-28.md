# Quality ERP — Regras de Negócio e Arquitetura Funcional

## 1. Fonte única
Evitar JSON paralelo para a mesma regra de negócio quando um Service já é a fonte oficial.

## 2. Histórico
Operações históricas não podem ser recalculadas de maneira destrutiva com valores atuais.

## 3. Produto e variação
Produto é o pai comercial. Variação pode possuir estoque, custo, preço e regra específicos.

## 4. Precificação
Prioridade: Variação > Produto > Categoria > Geral.

## 5. Vendedor/técnico
Devem ser usuários cadastrados, ligados por ID quando possível. Nome serve para apresentação e compatibilidade histórica.

## 6. Auditoria
Alterações relevantes devem registrar ator, instante, ação, entidade e antes/depois quando disponível.

## 7. Segurança
Permissão visual não substitui permissão de backend.

## 8. Estoque
Venda gera saída; compra gera entrada; estorno/troca/devolução devem gerar movimentos inversos rastreáveis.

## 9. Financeiro
Qualquer operação que altere obrigação/recebimento precisa manter vínculo com a origem.

## 10. Relatórios
Devem compartilhar bases de cálculo e ser visões diferentes sobre os mesmos dados, reduzindo duplicidade.

## 11. WM10 histórico
É fonte histórica somente leitura para comparações; não deve recriar eventos financeiros/estoque no ERP atual.

## 12. UX
Priorizar nomes humanos, filtros contextuais, Enter/botão em buscas sensíveis, feedback temporário e ausência de refresh desnecessário.
