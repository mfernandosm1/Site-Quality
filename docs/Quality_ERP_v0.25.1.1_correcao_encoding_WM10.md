# Quality ERP v0.25.1.1 — Correção definitiva de encoding WM10

## Ajuste
- A resposta da API passa a ser lida como bytes brutos.
- O importador testa UTF-8 estrito, Latin-1 e Windows-1252 antes de interpretar o JSON.
- A melhor decodificação é escolhida pela ausência de caracteres corrompidos e mojibake.
- Textos são normalizados em Unicode NFC.
- A importação é bloqueada caso a própria API já devolva o caractere de substituição `�`, evitando gravar nomes danificados.

## Teste
1. Reiniciar o painel.
2. Abrir Clientes > Importar WM10.
3. Executar uma nova simulação.
4. Conferir nomes com ç, ã, á, é, í, ó e ú.
5. Não confirmar a importação se qualquer `�` ainda aparecer.
