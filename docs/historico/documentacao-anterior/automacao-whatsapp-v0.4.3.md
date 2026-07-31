# Automação WhatsApp v0.4.3

## Objetivo
Organizar a biblioteca oficial de mídias por bloco e permitir abrir ou baixar cada arquivo.

## Alterações
- Agrupamento recolhível por bloco.
- Uma mídia usada em vários blocos aparece nos respectivos grupos, sem duplicar o arquivo físico.
- Grupo separado “Sem bloco vinculado” para mídias órfãs.
- Pesquisa instantânea por nome da mídia ou nome do bloco.
- Filtro por imagem, áudio, vídeo e arquivo.
- Ação “Abrir” em nova aba.
- Ação “Baixar” com nome amigável/original.
- Exclusão continua disponível apenas para mídias sem uso.
- Biblioteca oficial continua separada do futuro Inbox e das mídias das conversas.

## Arquivos alterados
- routes/automacao_whatsapp.js
- views/automacao_whatsapp.ejs

## Instalação
1. Pare o painel com Ctrl+C.
2. Faça backup dos arquivos atuais.
3. Substitua os dois arquivos acima.
4. Copie esta documentação para C:\Site\docs.
5. Inicie com npm start.

Não substitua blocos.json, midias.json, config.json, logs.json nem a pasta session.
