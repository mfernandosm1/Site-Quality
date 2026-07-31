# Automação WhatsApp — v0.3.0

## Objetivo
Conectar um número de teste ao Painel Quality usando `whatsapp-web.js`, sessão persistente com `LocalAuth` e envios exclusivamente manuais.

## Entregue nesta versão
- QR Code exibido no painel.
- Conectar e desconectar o cliente.
- Status atualizado a cada 2,5 segundos.
- Sessão persistente em `Site_with_content/content/automacao_whatsapp/session`.
- Restauração automática ao iniciar o painel quando uma sessão já existe.
- Número de teste padrão.
- Envio manual de texto.
- Envio manual de imagem, áudio como voz e arquivos permitidos.
- Execução manual de um bloco completo.
- Respeito às etapas de pausa, digitando e gravando áudio.
- Logs de conexão, QR, envios, etapas e falhas.
- Encerramento seguro do cliente ao fechar o painel com Ctrl+C.

## Segurança operacional
- Não existe leitura ou resposta automática a mensagens.
- Não existe disparo por gatilho.
- Não existe fila automática.
- Não existe envio de aniversariantes.
- Cada envio depende de clique manual.
- Apenas um bloco pode ser executado por vez.
- O número é validado no WhatsApp antes do envio.

## Instalação
Na pasta `C:\Site\painel`, execute:

```bat
npm install
npm start
```

O `package.json` instala:
- `whatsapp-web.js` 1.34.7
- `qrcode` 1.5.4

## Primeiro teste
1. Abra `http://localhost:3000/automacao-whatsapp?tab=conexao`.
2. Clique em **Conectar**.
3. No celular de teste, abra WhatsApp → Aparelhos conectados → Conectar aparelho.
4. Leia o QR Code.
5. Aguarde o status **WhatsApp conectado e pronto para envios manuais**.
6. Informe um número brasileiro com DDD, preferencialmente no formato `55 + DDD + número`.
7. Envie primeiro um texto curto.
8. Teste uma imagem e um áudio.
9. Execute um bloco pequeno.
10. Confira a aba **Logs**.

## Sessão persistente
A sessão fica em:

`C:\Site\Site_with_content\content\automacao_whatsapp\session`

O botão **Desconectar** encerra o navegador interno, mas preserva essa pasta. No próximo início do painel, a sessão é restaurada automaticamente.

Para trocar completamente o número no futuro, será necessário criar uma ação específica de **Apagar sessão**. Essa ação não foi incluída nesta versão para evitar exclusão acidental.

## Arquivos alterados
- `C:\Site\painel\server.js`
- `C:\Site\painel\package.json`
- `C:\Site\painel\routes\automacao_whatsapp.js`
- `C:\Site\painel\views\automacao_whatsapp.ejs`
- `C:\Site\docs\automacao-whatsapp-v0.3.0.md`

## Observações
`whatsapp-web.js` opera sobre o WhatsApp Web e não é uma API oficial da Meta. Mesmo com envios manuais e controlados, não existe garantia de risco zero de bloqueio. Nesta etapa, use apenas um número alternativo de teste e volumes mínimos.
