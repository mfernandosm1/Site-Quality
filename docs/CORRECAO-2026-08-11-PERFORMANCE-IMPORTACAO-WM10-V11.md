# Quality ERP — Performance da importação de produtos WM10 — V11
Data: 11/08/2026

## Problema encontrado
Ao clicar em "Importar famílias aprovadas", o importador fazia novamente uma leitura completa da API de produtos do WM10 antes de importar.

Na base analisada, a simulação trabalha com aproximadamente 11.661 registros. Assim, mesmo escolhendo apenas 2 produtos/famílias, o Quality percorria todas as páginas da API novamente.

Após concluir a importação, a interface ainda executava uma nova simulação completa, causando outra leitura do catálogo remoto.

## Correção
Foi criado um cache local temporário do catálogo retornado pela última simulação.

Fluxo novo:
1. "Buscar e analisar WM10" continua consultando a API normalmente, garantindo dados atuais.
2. O retorno completo dessa simulação é guardado localmente.
3. "Importar famílias aprovadas" reutiliza esse catálogo por até 30 minutos.
4. "Importar selecionados" e "Sincronizar" também reutilizam o cache.
5. O refresh automático após uma importação usa o cache, sem baixar todo o catálogo novamente.
6. Se o cache estiver vencido, ausente ou não contiver os códigos necessários, o sistema consulta novamente o WM10 automaticamente.

## Segurança / consistência
- O cache não substitui a simulação manual: ao clicar novamente em "Buscar e analisar WM10", os dados são atualizados pela API.
- Validade do cache: 30 minutos.
- Se algum produto necessário não estiver presente no cache, ocorre fallback automático para a API.
- Nenhuma regra de duplicidade, família, variação, preço ou estoque foi removida.

## Arquivos alterados
- services/wm10-product-import-service.js
- routes/produtos.js
- views/produtos_importar_wm10.ejs
- Readme/CORRECAO-2026-08-11-PERFORMANCE-IMPORTACAO-WM10-V11.md

## Teste recomendado
1. Reiniciar o Quality ERP.
2. Abrir Migração WM10.
3. Clicar em "Buscar e analisar WM10" e aguardar a simulação normal.
4. Aprovar uma família pequena com 1 ou 2 produtos.
5. Clicar em "Importar famílias aprovadas".
6. Comparar o tempo com os ~2 minutos anteriores.
7. Após o alerta de conclusão, confirmar que a tela atualiza sem uma segunda espera longa pela API.

Observação: a primeira simulação continuará levando o tempo da API do WM10. O ganho principal ocorre na importação e nos refreshes subsequentes.
