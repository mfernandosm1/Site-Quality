# Quality ERP v0.25.0.2 — Ajustes de impressão e O.S.

## Ajustes

- Corrigido o caminho público da logo dos comprovantes (`/public/uploads/erp/print`).
- Adicionado controle de versão da imagem para evitar cache da logo antiga.
- Adicionado cadastro visual da senha de desenho dentro da O.S. no PDV.
- A senha de desenho é salva junto à O.S. e impressa no comprovante de entrada.
- Removida a assinatura do responsável; permanece apenas a assinatura do cliente.
- Status personalizado incluído nos comprovantes de entrada e saída da O.S.
- Status padrão de O.S. aberta definido como `Na bancada`.

## Arquivos alterados

- `routes/erp.js`
- `views/pdv.ejs`
- `views/configuracoes_comprovantes.ejs`
- `public/css/painel-theme.css`
- `data/erp/settings/operation-statuses.json`

## Teste rápido

1. Reinicie o painel.
2. Abra Configurações > Comprovantes e Impressões.
3. Envie novamente a logo e salve.
4. Abra uma nova O.S.; confirme que o status inicial é `Na bancada`.
5. Abra a seção Senha de desenho, marque os pontos e salve a O.S.
6. Imprima a entrada da O.S. e confira logo, status, desenho e somente a assinatura do cliente.
7. Imprima a saída da O.S. e confira logo, status e somente a assinatura do cliente.
