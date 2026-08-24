# Contagem de estoque — modo contínuo

## Ajustes

- A leitura válida não desloca mais a página para o início.
- O foco retorna ao campo de leitura com `preventScroll`, preservando a posição da tela.
- O feedback de sucesso virou um aviso compacto e temporário sobreposto ao formulário, sem alterar a altura da página.
- O campo é limpo imediatamente após a contagem e fica pronto para a próxima leitura.
- O POST de contagem agora devolve a conferência atualizada; o front-end deixa de fazer uma segunda requisição completa após cada bip.
- Mensagens de erro continuam visíveis por mais tempo e não são tratadas como confirmação de leitura.

## Objetivo

Permitir sequência de leitura `bip → bip → bip` sem mouse, sem rolagem automática e com menos espera entre os itens.
