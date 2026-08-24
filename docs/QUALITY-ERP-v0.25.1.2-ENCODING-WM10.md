# Quality ERP v0.25.1.2 — Diagnóstico e proteção de encoding WM10

## Ajustes

- leitura da resposta da API em bytes antes do JSON;
- teste de UTF-8, Windows-1252 e ISO-8859-1;
- prioridade para o charset informado no cabeçalho, sem confiar nele cegamente;
- validação de todos os campos textuais, incluindo nome, cidade, bairro, endereço e razão social;
- bloqueio da simulação/importação caso exista caractere de substituição ou mojibake;
- diagnóstico com codificação escolhida, charset do cabeçalho e exemplos dos campos corrompidos;
- confirmação visual da codificação quando a simulação estiver íntegra.

## Teste rápido

1. Reiniciar o painel.
2. Abrir Clientes → Importar WM10.
3. Executar Consultar e simular.
4. Conferir nomes com ç, ã, á, é, í, ó e ú.
5. Conferir Santa Bárbara do Sul e outras cidades acentuadas.
6. Confirmar que aparece “Codificação validada”.
7. Não importar se qualquer caractere `�` aparecer.
