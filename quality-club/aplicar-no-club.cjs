/** Apply only catalog/home copy & search markup to a CURRENT public/index.html.
 * Never replace deployed auth/payment logic from an older archive.
 */
'use strict';
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const file=path.join(root,'public','index.html');
if(!fs.existsSync(file)){console.error('ERRO: execute na raiz do repositorio quality-club (pasta public/index.html).');process.exit(1);}
let html=fs.readFileSync(file,'utf8');
const original=html;
if(!html.includes('id="homeHero"')||!html.includes('id="planos"')||!html.includes('quality-club-search')){
  console.error('ERRO: esta versao do index.html nao foi reconhecida. Nenhuma alteracao realizada.');
  process.exit(1);
}
const needle='<div class="visual" aria-label="Ilustração de pesquisa de compatibilidades">';
function replaceDivAt(source,start,replacement){
  const tokens=/<\/?div\b[^>]*>/gi;tokens.lastIndex=start;let depth=0,m,end=-1;
  while((m=tokens.exec(source))){
    if(m.index===start)depth=1;
    else if(m[0].startsWith('</'))depth--;
    else depth++;
    if(depth===0){end=tokens.lastIndex;break;}
  }
  if(end<0)throw new Error('Nao foi possivel localizar o fim do bloco da busca.');
  return source.slice(0,start)+replacement+source.slice(end);
}
const liveVisual=`<div class="visual qc-live-visual" aria-label="Busca de compatibilidade">
  <div class="vtop"><strong>QUALITY CLUB</strong><span class="tag">BUSCA DE COMPATIBILIDADE</span></div>
  <div class="mockbox"><div class="minilabel">MODELO DO APARELHO</div>
    <form id="qc-public-form" class="qc-public-form" role="search"><label class="sr-only" for="qc-public-input">Pesquisar modelo de celular</label><input type="search" id="qc-public-input" name="modelo" minlength="2" maxlength="64" placeholder="Ex.: Samsung A10 ou S25" autocomplete="off" required><button class="btn primary" type="submit">Pesquisar</button></form>
    <div id="qc-public-results" aria-live="polite" aria-atomic="true"></div>
  </div>
</div>`;
if(html.includes(needle)){
  html=replaceDivAt(html,html.indexOf(needle),liveVisual);
}else if(!html.includes('id="qc-public-form"')){
  console.error('ERRO: bloco visual da home foi alterado e nao pode ser identificado com seguranca. Nenhuma alteracao realizada.');
  process.exit(1);
}
function replaceText(oldText,newText){if(html.includes(oldText))html=html.replace(oldText,newText);}
replaceText('<p>Uma central para consultar compatibilidades sem depender de listas espalhadas.</p>',
            '<p>A partir de hoje você nunca mais vai perder uma venda por não ter o modelo certo.</p>');
replaceText('<p>Começamos pela tabela de películas e, aos poucos, adicionaremos novos recursos úteis para quem vive de assistência e vendas.</p>','');
replaceText('<p>Planos recorrentes para profissionais. Você pode escolher um plano e completar o cadastro. A contratação é feita com pagamento real e renovação automática até o cancelamento. Confira as condições antes de confirmar.</p>','');
replaceText('<span class="eyebrow">Acesso profissional</span>','');
replaceText('<p class="launch">* Ambiente de testes autorizado, sem cobranças reais. A escolha do plano não inicia uma cobrança automaticamente.</p>','');
replaceText(' Não é uma empresa separada e não exige a criação de outra marca.','');
const note='<div class="note"><strong>Seu próximo atendimento pode ser mais simples.</strong><p>Estamos preparando uma experiência focada em busca rápida, organização das informações e acesso seguro por conta individual.</p><button class="btn primary only-guest" data-auth="signup">Criar minha conta</button><a href="#planos" class="btn only-logged">Consultar planos</a></div>';
replaceText(note,'');
const cssTag='<link rel="stylesheet" href="/quality-club-busca.css?v=20261122-1">';
if(!html.includes('/quality-club-busca.css'))html=html.replace('</head>',cssTag+'\n</head>');
const bootstrap="\n/* Busca publica e assinante: reutiliza o cliente atual, sem alterar login ou pagamentos. */\nimport('./quality-club-busca.js?v=20261122-1').then(m=>m.initQualityClubSearch({client})).catch(e=>console.error('Busca Quality Club indisponivel:',e));\n";
if(!html.includes('initQualityClubSearch({client})')){
  const matches=[...html.matchAll(/<script\s+type="module">/g)];
  if(matches.length===0){console.error('ERRO: script de autenticacao nao encontrado. Nenhuma alteracao realizada.');process.exit(1);}
  const last=matches[matches.length-1].index;
  const end=html.indexOf('</script>',last);
  if(end<0){console.error('ERRO: script nao finalizado.');process.exit(1);}
  const body=html.slice(last,end);
  if(!body.includes('client')||!body.includes('createClient')){
    console.error('ERRO: cliente Supabase nao identificado no script de autenticacao.');process.exit(1);
  }
  html=html.slice(0,end)+bootstrap+html.slice(end);
}
// The protected search Edge Function may need the new custom-domain origin.
// Update its SOURCE only if present, without touching entitlements or deploying it.
const edge=path.join(root,'supabase','functions','quality-club-search','index.ts');
if(fs.existsSync(edge)){
  const code=fs.readFileSync(edge,'utf8');
  if(code.includes('ALLOWED_ORIGINS')&&!code.includes('https://club.qualitycel.com.br')){
    const m=code.match(/'https:\/\/quality-club-e24\.pages\.dev',?/);
    if(m){
      const backup=path.join(root,'QC_BACKUP_quality_club_search_antes_CORS.ts');
      if(!fs.existsSync(backup))fs.writeFileSync(backup,code,'utf8');
      const revised=code.replace(m[0],m[0]+"\n  'https://club.qualitycel.com.br',");
      fs.writeFileSync(edge,revised,'utf8');
      console.log('Origem HTTPS adicionada no codigo da Edge Function; publicar a funcao no Supabase.');
    }else console.log('ATENCAO: arquivo Edge Search existe, mas a lista CORS nao foi reconhecida.');
  }
}
if(html!==original){
  const backup=path.join(root,'QC_BACKUP_index_antes_da_busca.html');
  if(!fs.existsSync(backup))fs.writeFileSync(backup,original,'utf8');
  fs.writeFileSync(file,html,'utf8');
  console.log('OK: public/index.html atualizado. Backup criado.');
}else console.log('OK: public/index.html ja esta atualizado.');
