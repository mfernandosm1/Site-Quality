# Painel Quality ERP v0.16.2 — Fundação Financeira

## Objetivo
Consolidar a Fundação Financeira antes da implantação das telas operacionais de Contas a Receber, preservando compatibilidade com os dados e módulos existentes.

## Arquivos alterados
- `services/finance-service.js`
- `views/configuracoes_financeiro.ejs`
- `views/layout.ejs`
- `public/js/financeiro-fundacao.js`
- `public/css/painel-theme.css`

## Arquivos novos
- `public/js/help-tips.js`
- `docs/QUALITY-ERP-v0.16.2-FUNDACAO-FINANCEIRA.md`

## Alterações implantadas
1. A interface passou a exibir **Centros de Custo** no lugar de Categorias Financeiras.
2. Os Planos de Conta continuam usando internamente `categoryId` para compatibilidade, porém são organizados visualmente e funcionalmente dentro dos Centros de Custo.
3. Separação clara entre registros ativos e inativos.
4. Modal financeiro protegido contra fechamento acidental, duplo envio e salvamento indevido.
5. Formas de Pagamento ampliadas com:
   - parcelamento;
   - valor mínimo de parcela;
   - prazo de recebimento;
   - taxa administrativa;
   - juros mensais;
   - repasse de juros;
   - troco;
   - primeiro vencimento;
   - código de pagamento NFC-e;
   - tipo fiscal;
   - adquirente;
   - exigência de bandeira.
6. Preparação estrutural de Contas a Receber com arquivos próprios para títulos e eventos.
7. Padrão reutilizável de balões informativos por `.help-tip[data-tooltip]`, com suporte a mouse, teclado, foco e toque.
8. Revisão Black OLED do Financeiro.

## Compatibilidade e dados
- Não renomear manualmente `data/erp/finance/categories.json`.
- O nome do arquivo e o campo `categoryId` foram preservados para evitar quebra de dados já cadastrados.
- Na primeira inicialização, o serviço cria automaticamente, se ainda não existirem:
  - `receivables.json`;
  - `receivable-events.json`.

## Implantação
1. Fechar o Painel Quality ERP.
2. Fazer backup de `C:\Site\painel`.
3. Extrair o ZIP na raiz `C:\Site\painel`, mantendo as pastas.
4. Confirmar a substituição somente dos arquivos existentes no ZIP.
5. Iniciar o painel e abrir `Configurações > Configurações Financeiras`.
6. Testar criação, edição, cancelamento e fechamento dos três tipos de cadastro.
7. Reiniciar o painel uma vez para confirmar a criação da estrutura de Contas a Receber.

## Testes recomendados
- Cancelar um cadastro novo sem salvar.
- Editar e fechar pelo X, Escape e clique no fundo do modal.
- Clicar duas vezes rapidamente em Salvar e confirmar que ocorre apenas um envio.
- Criar Centro de Custo e Plano de Conta vinculado.
- Alternar Ativos/Inativos.
- Editar uma Forma de Pagamento e validar persistência dos novos parâmetros.
- Revisar toda a tela nos temas Claro, Escuro e Black OLED.
