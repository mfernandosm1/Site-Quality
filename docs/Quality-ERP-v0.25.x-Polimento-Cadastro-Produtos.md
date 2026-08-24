# Quality ERP v0.25.x — Polimento do Cadastro de Produtos

## Arquivo alterado

- `C:\Site\painel\views\produtos.ejs`

## Ajustes realizados

### Novo produto

Ao abrir o modo **Novo produto**, ficam ocultos os blocos de contexto da listagem:

- Cadastro Mestre de Produtos;
- ERP · Produtos e descrição omnichannel;
- cards de indicadores;
- título e descrição do Workspace de Produtos.

Permanecem acessíveis:

- Voltar ao ERP;
- Produtos cadastrados;
- Novo produto;
- Voltar à lista;
- formulário de cadastro.

Ao retornar para a listagem, os blocos de contexto e indicadores voltam a aparecer normalmente.

### Central de Operações em Lote

- removido definitivamente o texto `0 selecionado(s)`;
- cabeçalho recolhido mostra apenas `Central de Operações em Lote`;
- lógica de seleção e ações em lote foi preservada.

## Compatibilidade

- nenhuma rota foi alterada;
- nenhum campo de produto foi removido;
- nenhum dado foi migrado ou apagado;
- funcionamento dos temas Claro e Black OLED preservado.

## Checklist de teste

1. Abrir `/produtos` e confirmar indicadores e Workspace visíveis.
2. Clicar em **Novo produto**.
3. Confirmar que título geral, descrição, cards e texto do Workspace desapareceram.
4. Confirmar os botões Voltar ao ERP, Produtos cadastrados, Novo produto e Voltar à lista.
5. Clicar em **Voltar à lista** e confirmar que os blocos retornam.
6. Conferir a Central de Operações em Lote recolhida, sem contador zero.
7. Expandir a Central e testar seleção e uma ação em lote.
8. Repetir nos temas Claro e Black OLED.
