# Correção — Orçamentos / mensagem da lista do WhatsApp

Data: 24/08/2026

## Problema

Ao colar listas de aparelhos com cores/baterias usando travessão dentro das próprias variações (ex.: `blue — 86%`), a tabela de preparação ficava correta, mas a mensagem para o cliente podia repetir as variações no nome do produto.

Exemplo afetado:
- iPhone 15 Pro — 128GB
- blue — 86%
- black — 88% 88%
- white — 87% 85%
- natural — 85% 85%

## Causa

A montagem do nome comercial tentava separar o nome usando travessões. Como as próprias variações também continham travessões, o trecho de cores/baterias permanecia no nome-base e depois era acrescentado novamente a partir da lista estruturada de variações.

## Correção

- A tabela/importação não foi alterada, pois já estava interpretando os dois modelos corretamente.
- A correção foi aplicada somente na montagem da mensagem comercial.
- Quando existem variações estruturadas em `colors`, o sufixo original dessas variações é removido do nome-base antes de remontar a apresentação.
- Funciona tanto com hífen quanto com travessão dentro das linhas de cor/bateria.
- Mantém a condição comercial (ex.: Usado, Seminovo, Novo lacrado) apenas uma vez.

## Resultado esperado

Cada aparelho aparece uma única vez na mensagem, com suas respectivas cores/baterias também uma única vez.
