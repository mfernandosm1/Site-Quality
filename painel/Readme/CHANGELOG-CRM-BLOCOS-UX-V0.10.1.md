# CRM / Automação WhatsApp — UX de blocos v0.10.1

Data: 14/08/2026

## Ajustes

- Corrigido o fundo claro atrás da pesquisa de blocos do Inbox no tema Black OLED.
- Avisos de sucesso do módulo deixam de aparecer duplicados no layout e no conteúdo.
- O aviso de bloco salvo agora é compacto, flutuante e desaparece automaticamente em aproximadamente 1,7 s.
- O parâmetro `flash` é removido da URL após a exibição para não reaparecer ao atualizar a página.
- Campo **Descrição** do cadastro de bloco virou seção opcional recolhida e mais compacta.
- Campos **Categoria/pasta** e **Gatilho/atalho** ficaram menores para reduzir espaço vertical e horizontal desnecessário.
- Ações **Expandir todas** e **Recolher todas** foram convertidas em botões compactos por ícone, com `title` e `aria-label`.
- A mensagem grande de bloco sem etapas foi substituída por um ícone de informação com tooltip.
- A explicação da **Biblioteca de blocos** foi movida para um ícone de informação ao lado do título.

## Arquivos alterados

- `views/automacao_whatsapp.ejs`
- `routes/automacao_whatsapp.js`
