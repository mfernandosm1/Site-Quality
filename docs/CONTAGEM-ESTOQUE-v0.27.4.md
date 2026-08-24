# Contagem e Ajuste de Estoque — v0.27.4

## Ajustes desta entrega

- Texto de confirmação da Contagem Total alterado para deixar explícito que o estoque dos produtos não contados será zerado.
- Todas as contagens criadas durante os testes foram removidas do histórico.
- As movimentações de estoque geradas exclusivamente por essas contagens de teste foram removidas e seus efeitos físicos foram revertidos, preservando o estoque como se os testes não tivessem ocorrido.
- Listagem de Produtos passou a abrir com 50 produtos por página por padrão para reduzir o peso inicial da tela.
- Busca de Produtos corrigida para localizar trechos internos de nomes/códigos. Ex.: `2032` encontra `Bateria CR2032`.
- A pesquisa não filtra mais a tabela local a cada tecla. Ela aguarda uma curta pausa e então executa a pesquisa do catálogo, reduzindo o efeito de piscar e o trabalho repetido no navegador.

## Ideia futura registrada — cancelamento administrativo

Criar em Configurações > Manutenção/Estoque uma ferramenta administrativa para encerrar/cancelar uma contagem problemática que tenha ficado presa por erro operacional.

Regras recomendadas:

- acesso somente a usuário administrador;
- solicitar senha/reautenticação antes da ação;
- exigir motivo;
- nunca apagar silenciosamente a contagem;
- registrar usuário, data/hora, motivo e estado anterior;
- não desfazer movimentações já aplicadas sem uma operação específica e auditada de reversão.

Esse recurso deve funcionar como ferramenta de suporte e contingência, e não como fluxo normal de operação.
