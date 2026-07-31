# Painel Quality ERP v0.16.0.4 — Organização das Configurações Financeiras

## Objetivo

Simplificar a configuração financeira para que a operação diária permaneça em **ERP → Financeiro** e os parâmetros fiquem em **Configurações → Financeiro**.

## Ajustes desta revisão

- Formas de pagamento mantidas como cadastro global, com disponibilidade por módulo.
- Remoção definitiva de campos técnicos como direção, evento gerado e classificação da forma de pagamento.
- Renomeado **Dias previstos para liquidação** para **Prazo previsto para recebimento**.
- A baixa automática e o prazo previsto agora possuem explicações independentes.
- Categorias e Planos de Contas reunidos na mesma tela.
- Cada Plano de Conta passa a pertencer a uma Categoria Financeira.
- Migração automática dos planos criados na versão inicial para as categorias correspondentes.
- Naturezas, Situações e Origens deixam de ser cadastros livres e passam a ser regras protegidas do motor financeiro.
- Centro de custo permanece preparado internamente, usando **Operação geral** como padrão, sem exigir configuração agora.
- Inclusão do componente reutilizável `.help-tip` para balões informativos.

## Regra de UX adotada

Balões informativos devem ser utilizados progressivamente em todo o Painel Quality para explicar:

- o que a ferramenta faz;
- quando deve ser usada;
- como determinada configuração afeta a operação;
- cuidados antes de salvar ou executar uma ação.

O padrão visual criado nesta implantação é:

```html
<span class="help-tip" tabindex="0" data-tooltip="Explicação curta e objetiva.">?</span>
```

Ele funciona com mouse e também com foco pelo teclado.

## Conceitos

### Categoria financeira

Agrupa Planos de Contas relacionados. Exemplos: Custos Comerciais, Serviços, Fornecedores e Operacional.

### Plano de conta

Identifica com o que o valor está relacionado, como Frete, Energia, Tarifas Bancárias ou Venda de Mercadorias.

### Centro de custo

Identifica para qual área ou unidade o gasto pertence. O recurso está preparado, mas não é obrigatório nesta etapa.

### Baixa automática

Quando ativa, a obrigação é considerada paga imediatamente ao utilizar a forma de pagamento.

### Prazo previsto para recebimento

Estimativa de quando o dinheiro ficará disponível. Não confirma pagamento e não executa baixa automática sozinho.

## Arquivos desta entrega

- `views/configuracoes_financeiro.ejs`
- `public/js/financeiro-fundacao.js`
- `public/css/painel-theme.css`
- `services/finance-service.js`
- `docs/ERP-v0.16.0-FUNDACAO-FINANCEIRA.md`

## Instalação

1. Fazer backup de `C:\Site\painel`.
2. Extrair o ZIP em `C:\Site\painel` preservando as pastas.
3. Substituir somente os arquivos presentes no pacote.
4. Reiniciar o painel.
5. Acessar `/configuracoes/financeiro`.

## Testes recomendados

1. Abrir Formas de Pagamento e editar Dinheiro, PIX, Cartão e Boleto.
2. Confirmar que não aparecem campos de direção, receita, despesa ou evento gerado.
3. Passar o mouse sobre os ícones `?`.
4. Criar uma Categoria Financeira.
5. Criar um Plano de Conta dentro dela.
6. Editar e inativar categoria e plano.
7. Revisar os temas Claro e Black OLED.
8. Confirmar que PDV, O.S. e Caixa continuam inalterados.


## Correção v0.16.0.5 — Cancelamento seguro e simplificação dos planos

- Corrigidos os botões **Cancelar** e **Fechar** dos modais financeiros. Eles agora são botões comuns e nunca disparam validação nem salvamento.
- O formulário é limpo ao cancelar, fechar no `×` ou pressionar `Esc`.
- Removido o campo **Plano superior**. Nesta fase, todo plano de conta pertence diretamente a uma categoria financeira.
- A migração elimina relações antigas de plano superior sem excluir cadastros.
- Categorias continuam classificadas como **Receita** ou **Despesa**, e os planos herdam essa classificação.
- Registros de teste já gravados anteriormente não são apagados automaticamente para evitar exclusão indevida; podem ser inativados na interface.

### Regra de uso

- Categoria financeira: grupo principal classificado como Receita ou Despesa.
- Plano de conta: item específico usado no lançamento, sempre vinculado diretamente a uma categoria.
- Cancelar/Fechar: jamais envia o formulário ou cria cadastro.

## v0.16.0.6 — Visibilidade de inativos e refinamento Black OLED

- Categorias, planos de contas e formas de pagamento inativados deixam de aparecer na visão principal.
- Adicionado filtro **Ativos / Inativos** para localizar, revisar e reativar cadastros.
- Ao cadastrar uma categoria, o campo Categoria permanece oculto; esse campo aparece somente no cadastro de plano de conta.
- Reforçada a regra visual `[hidden]` nos formulários para impedir que campos de outro tipo de cadastro sejam exibidos.
- Corrigido o contraste dos cartões de Configurações Gerais no tema Black OLED.
