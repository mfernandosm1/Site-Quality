# Automação WhatsApp v0.4.2

## Objetivo
Adicionar vídeos aos blocos e criar a biblioteca oficial de mídias da loja, separada do futuro Inbox e das mídias de conversas.

## Entregas
- Nova etapa `video` no construtor.
- Upload de MP4, WebM e MOV/QuickTime.
- Prévia de vídeo no editor e no simulador.
- Envio de vídeo em blocos completos e no envio manual.
- Biblioteca oficial na aba **Mídias**.
- Catálogo em `content/automacao_whatsapp/midias.json`.
- Novos arquivos organizados em:
  - `public/uploads/automacao_whatsapp/blocos/imagens`
  - `public/uploads/automacao_whatsapp/blocos/audios`
  - `public/uploads/automacao_whatsapp/blocos/videos`
  - `public/uploads/automacao_whatsapp/blocos/arquivos`
- Reutilização de mídias já cadastradas diretamente no editor.
- Importação automática para o catálogo das mídias antigas já usadas em blocos.
- Contagem dos blocos que utilizam cada mídia.
- Exclusão bloqueada quando a mídia está em uso.
- Exclusão segura de mídias órfãs.

## Separação de ambientes
A biblioteca desta versão contém somente arquivos oficiais dos blocos/fluxos da loja.

O futuro Inbox deverá usar outra estrutura, sem misturar arquivos de clientes:

```text
content/automacao_whatsapp/inbox/
public/uploads/automacao_whatsapp/inbox/
```

## Compatibilidade
- Os blocos existentes continuam funcionando.
- Caminhos antigos em `public/uploads/automacao_whatsapp/` são preservados.
- A sessão LocalAuth não é alterada.
- Nenhuma resposta automática foi adicionada.

## Limite de upload
O limite das mídias foi ampliado para 80 MB. Para vídeos maiores, recomenda-se compactar antes do upload para evitar travamento e demora no envio pelo WhatsApp Web.

## Arquivos alterados
- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`

## Testes recomendados
1. Reiniciar o painel e confirmar a reconexão do WhatsApp.
2. Abrir um bloco e adicionar uma etapa de vídeo.
3. Fazer upload de um MP4 pequeno.
4. Salvar o bloco e testar no simulador.
5. Executar o bloco no número de teste.
6. Abrir a aba **Mídias** e confirmar a contagem de uso.
7. Criar outra etapa e selecionar o mesmo vídeo pela biblioteca, sem novo upload.
8. Confirmar que uma mídia em uso aparece protegida contra exclusão.
