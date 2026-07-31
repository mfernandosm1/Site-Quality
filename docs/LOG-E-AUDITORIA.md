# LOG e Auditoria Global

## Separação de responsabilidades
O LOG registra o fluxo operacional amplo. A Auditoria registra mudanças relevantes que exigem comparação, responsabilidade e investigação.

## LOG
Campos principais: ID, data/hora, nível, categoria, módulo, ação, usuário, resultado, entidade, documento, IP, dispositivo, rota, método, status HTTP, duração e detalhes seguros.

## Auditoria
Campos principais: ID, data/hora, módulo, ação, usuário, entidade, documento, motivo, antes, depois, IP e request ID.

## Retenção inicial
Cada arquivo aceita até 50.000 registros. Esta política deve ser substituída por rotação/arquivamento antes de uso intenso com vários usuários.

## Privacidade
Nunca armazenar senha, token, segredo, mídia bruta, áudio, imagens, base64 ou conteúdo integral de formulários nos logs.
