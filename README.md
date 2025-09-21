
# Quality Celulares - Versão v22

Site estático com HTML/CSS/JS responsável por exibir catálogo, banners e informações de contato.
Esta versão (v22) traz:
- Menu e rodapé padronizados em todas as páginas (desktop + mobile).
- Menu mobile moderno (drawer) abrindo pela direita.
- Carrossel automático de banners (usa `<picture>` para servir imagens mobile/desktop).
- Banners mobile preparados para 300x250 px (faça upload dos `banner1-mobile.png` etc).
- Páginas: `index.html`, `sobre.html`, `formas-de-pagamento.html`.
- Arquivos auxiliares: `style.css`, `main.js`, `images/`.

## Como testar localmente
1. Descompacte o zip.
2. Abra `index.html` em um navegador (não precisa de servidor).

## Publicar no GitHub Pages
1. Crie um repositório no GitHub (ex: `quality-celulares`).
2. Faça commit dos arquivos e dê push para o branch `main`:
```bash
git init
git add .
git commit -m "v22 - site Quality Celulares"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```
3. No GitHub, vá em **Settings > Pages** e selecione a branch `main` e a pasta `/ (root)`.
4. A URL normalmente será: `https://SEU-USUARIO.github.io/SEU-REPO/`

## Substituir imagens
Coloque suas imagens reais dentro da pasta `images/` substituindo os placeholders:
- `logo.png` — logo da loja
- `banner1.png`, `banner2.png`, `banner3.png` — banners desktop
- `banner1-mobile.png`, `banner2-mobile.png`, `banner3-mobile.png` — banners mobile (300x250)
- `pocox7pro.png`, `redmi14c.png` — imagens dos produtos

## Notas
- Se quiser mesclar `main.js` com seu próprio `main.js`, me envie o conteúdo e eu faço a integração.
- Se quiser que eu faça o deploy direto no GitHub (você me fornecer o repositório), eu posso orientar passo a passo.
