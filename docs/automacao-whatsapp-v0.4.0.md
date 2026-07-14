# Automação WhatsApp v0.4.0 — Biblioteca e Editor de Blocos

## Objetivo
Evoluir os blocos de resposta antes da criação do Inbox e das automações de entrada.
A versão mantém toda a conexão e os envios manuais da v0.3.0.

## Novidades
- Biblioteca visual em cards.
- Pesquisa por nome, descrição, gatilho ou categoria.
- Filtro por categoria/pasta.
- Filtro de favoritos.
- Favoritar e desfavoritar blocos.
- Categoria/pasta em cada bloco.
- Duplicação de blocos pela biblioteca.
- Prévia de qualquer bloco sem precisar abri-lo para edição.
- Editor com representação visual de início e etapas numeradas.
- Duplicação de uma etapa.
- Teste isolado de uma etapa no simulador.
- Movimentação de etapas para cima ou para baixo.
- Alerta visual de alterações não salvas.
- Preservação de texto, imagem, áudio, arquivo, pausa e opções.

## Arquivos alterados
- `C:\Site\painel\routes\automacao_whatsapp.js`
- `C:\Site\painel\views\automacao_whatsapp.ejs`
- `C:\Site\painel\package.json`

## Arquivo de dados
Os blocos continuam em:

`C:\Site\Site_with_content\content\automacao_whatsapp\blocos.json`

A estrutura ganhou dois campos opcionais e retrocompatíveis:

```json
{
  "categoria": "Vendas",
  "favorito": true
}
```

Blocos antigos sem esses campos continuam funcionando e aparecem na categoria `Geral`.

## Segurança
- Nenhuma resposta automática foi adicionada.
- Nenhuma mensagem recebida é armazenada nesta versão.
- O Inbox ainda não foi iniciado.
- Envios reais continuam exigindo ação manual.
- A sessão LocalAuth da v0.3.0 é preservada.

## Testes recomendados
1. Reiniciar o painel e confirmar a reconexão automática.
2. Abrir a aba Blocos.
3. Editar um bloco e definir categoria e favorito.
4. Duplicar uma etapa e salvar.
5. Testar uma etapa isoladamente.
6. Usar pesquisa e filtro de categoria.
7. Favoritar/desfavoritar um bloco.
8. Abrir a prévia diretamente pela biblioteca.
9. Executar o bloco na aba Conexão e teste.

## Próxima etapa prevista
Inbox manual: captura local das mensagens, lista de conversas, chat e seletor compacto de blocos dentro da conversa. Nenhum disparo automático até validação dessa etapa.
