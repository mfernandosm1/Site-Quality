/* Quality Celulares · Perguntas: catálogo público + respostas aprovadas.
 * Sem IA generativa e sem credenciais privadas no navegador.
 * Modo vitrine: perguntas anonimas; respostas moderadas pela Quality. */
(function(){'use strict';
if(window.QualityProductQuestions && window.QualityProductQuestions.version==='4.0')return;
var css=document.createElement('style');css.textContent=`
.quality-pq{max-width:1100px;margin:28px auto;padding:24px;border:1px solid #dbe2ed;border-radius:15px;background:#fff;color:#17243b;box-shadow:0 2px 12px rgba(16,36,66,.035)}
.quality-pq h2{font-size:23px;margin:0 0 15px;line-height:1.25}.quality-pq-row{display:flex;gap:12px}.quality-pq-input-wrap{position:relative;min-width:0;flex:1}
.quality-pq input{width:100%;min-height:52px;box-sizing:border-box;border:1px solid #bdc8d9;border-radius:9px;padding:12px 43px 12px 14px;font:inherit;color:#18243b;background:white;outline-offset:2px}
.quality-pq input:focus{border-color:#2676ed}
@media(max-width:850px){.quality-pq input{font-size:16px!important}}.quality-pq-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;min-height:0!important;padding:0!important;border:0!important;border-radius:50%;background:transparent!important;color:#56708b!important;font-weight:400!important;font-size:23px;cursor:pointer}
.quality-pq button.quality-pq-ask,.quality-pq button.quality-pq-send{min-height:52px;border:0;border-radius:9px;background:#2677ef;color:white;font-weight:700;padding:12px 22px;cursor:pointer;font:inherit;font-weight:700}
.quality-pq button:disabled{opacity:.6;cursor:wait}.quality-pq-output{margin-top:14px;border-radius:9px;background:#e9f2ff;overflow:hidden;line-height:1.55}
.quality-pq-response{padding:18px 20px}.quality-pq-answer-label{display:flex;gap:7px;align-items:center;color:#426da5;font-size:13px;margin-top:7px}.quality-pq-answer-text{margin:0;font-size:15px;white-space:pre-line}
.quality-pq-help{border-top:1px solid #d6e1f3;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 19px}.quality-pq-help span{font-size:12px;color:#607188}
.quality-pq-help button,.quality-pq-history button{background:transparent;color:#286ee1;border:0;cursor:pointer;font:inherit;padding:5px}
.quality-pq-history{margin-top:18px;padding-top:16px;border-top:1px solid #e1e8f2}
.quality-pq-history-title{font-size:16px;font-weight:700;margin:0 0 12px}
.quality-pq-history-item{padding:13px 0 15px;border-bottom:1px solid #e1e8f2;overflow-wrap:anywhere}
.quality-pq-history-question{margin:0 0 8px;font-size:15px;font-weight:650;color:#17243b}
.quality-pq-history-answer{margin:0 0 6px;padding-left:14px;border-left:2px solid #ced8e7;color:#37485c;font-size:14px;line-height:1.6;white-space:pre-line}
.quality-pq-history-date{display:block;padding-left:16px;color:#8893a3;font-size:11px;font-weight:400;line-height:1.45}
.quality-pq-show-more{margin-top:13px;padding:8px 0!important;font-size:14px!important;font-weight:600!important}
.quality-pq-consult-link{margin-left:auto!important;font-size:13px!important;font-weight:600!important;white-space:nowrap}
.quality-pq-feedback{display:flex;align-items:center;gap:7px}.quality-pq-feedback button{min-width:34px;border:1px solid #c6d5e7;border-radius:50%;background:transparent;color:#4d6481;padding:5px;cursor:pointer}.quality-pq-feedback button[aria-pressed=true]{background:#d4e5ff;border-color:#5291fa}
.quality-pq-success{background:#e7f6ed;color:#156239;padding:15px 19px;border-radius:9px;margin-top:14px;line-height:1.5}.quality-pq[aria-busy=true] .quality-pq-ask{opacity:.7}.quality-pq [hidden]{display:none!important}
@media(max-width:640px){.quality-pq-consult-link{width:100%;margin-left:0!important;text-align:left}.quality-pq-help{flex-wrap:wrap}.quality-pq{padding:18px;margin:17px 12px}.quality-pq h2{font-size:21px}.quality-pq-row{gap:8px}.quality-pq button.quality-pq-ask{padding:10px 12px;font-size:14px}.quality-pq-response{padding:14px}.quality-pq-help{padding:10px 14px}}
`;document.head.appendChild(css);
function el(tag,cls,label){var n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;}
function clean(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
var STOP=new Set('a o e de do da dos das um uma por para com que qual quais quanto quantas quantos tem esse essa este esta voce seu sua no na nos nas produto me ele ela mais sobre queria saber funciona possuem existe'.split(' '));
function tokens(v){return clean(v).split(' ').filter(t=>t.length>=3&&!STOP.has(t));}
function unique(v){return [...new Set(v)];}
var subjects=[
 {key:'water',terms:['agua','molhar','nadar','piscina','chuva','impermeavel','resistente a agua','resistencia','atm'],facts:['5 atm','ip67','ip68','resistencia','agua','impermeavel']},
 {key:'sport',terms:['esportivo','esportivas','esportes','modalidades','treinos','atividades fisicas','modo esportivo'],facts:['modalidades','modos esportivos','esporte']},
 {key:'battery',terms:['bateria','autonomia','carrega','carregamento','carga','tempo dura','duracao'],facts:['bateria','autonomia','carga']},
 {key:'screen',terms:['tela','display','amoled','tamanho da tela','polegadas','resolucao'],facts:['tela','display','amoled','polegadas']},
 {key:'sensor',terms:['sensores','sensor','batimento','cardiaco','oxigenio','spo2','sono','saude'],facts:['sensor','biotracker','batimento','spo2','saude']},
 {key:'connection',terms:['bluetooth','conectividade','wifi','wi fi','nfc','chamadas','ligacao'],facts:['bluetooth','conectividade','wifi','chamadas','nfc']},
 {key:'compatibility',terms:['compatibilidade','compativel','funciona com','android','ios','iphone','samsung','app','aplicativo'],facts:['compatibilidade','android','ios','iphone','aplicativo','app']},
 {key:'dimensions',terms:['comprimento','tamanho','dimensoes','metros','centimetros','largura','altura','cm','mm'],facts:['comprimento','dimensoes','largura','altura','tamanho','cm','mm']},
 {key:'camera',terms:['camera','foto','filmagem','video','megapixel'],facts:['camera','mp','megapixels']},
 {key:'storage',terms:['armazenamento','memoria interna','espaco','quantos gb'],facts:['armazenamento','gb','memoria interna']},
 {key:'ram',terms:['ram','memoria ram'],facts:['ram']},
 {key:'gps',terms:['gps','localizacao','mapas'],facts:['gps','localizacao']},
 {key:'included',terms:['acompanha','incluso','incluso na caixa','vem com','acessorios inclusos','carregador'],facts:['inclusos','na caixa','acompanha','carregador']}
];
function topic(text){var t=clean(text);var scores=subjects.map(s=>({key:s.key,score:s.terms.reduce((acc,p)=>acc+(t.includes(clean(p))?clean(p).length>=10?3:2:0),0)}));scores.sort((a,b)=>b.score-a.score);return scores[0].score>0?scores[0].key:null;}
function approvedMatch(q,answers){var n=clean(q);if(n.length<7)return null;
 var same=answers.find(x=>clean(x.question)===n);if(same)return same;
 var a=unique(tokens(q)),category=topic(q);if(a.length<1||!category)return null;
 return answers.find(x=>{if(category!==topic(x.question))return false;
  var b=unique(tokens(x.question));if(b.length<2)return false;
  var digits=x.question.match(/\d+[a-z]*/ig)||[], asked=q.match(/\d+[a-z]*/ig)||[];
  if((digits.length||asked.length)&&clean(digits.join(' '))!==clean(asked.join(' ')))return false;
  var same=a.filter(z=>b.includes(z)).length;
  if(same>=2&&same/a.length>=.7&&same/b.length>=.7)return true;
  // Para perguntas curtas, aproveita apenas temas bem definidos e sem códigos/modelos.
  return ['water','sport','battery','screen'].includes(category) && digits.length===0 && asked.length===0 && same>=1 && same/a.length>=.5 && b.length<=4;
 })||null;
}
// Apenas itens verificados e aprovados no ERP entram aqui. Não faz requisições a fabricantes.
function knowledgeMatch(q,slug,knowledge){
 var n=clean(q),a=unique(tokens(q));if(n.length<7||!a.length)return null;
 var list=knowledge.filter(function(x){return x&&x.answer&&x.question&&((x.scope==='store')||(x.scope==='product'&&x.slug===slug));});
 // A busca por palavras é conservadora para não devolver política comercial ou modelo incorretos.
 var ranked=list.map(function(x){
  var target=clean(x.question),b=unique(tokens(x.question));
  if(n===target)return {x,score:100};
  if(!b.length)return null;
  var common=a.filter(t=>b.includes(t)).length;
  var numericA=(n.match(/\b\d+[a-z]*\b/g)||[]).join(','),numericB=(target.match(/\b\d+[a-z]*\b/g)||[]).join(',');
  if(numericA!==numericB)return null;
  var score=Math.min(common/a.length,common/b.length);
  // Não comparar "frete" com "garantia", nem generalizar pergunta com modelo diferente.
  return common>=2&&score>=.72?{x,score}:null;
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 return ranked[0]?ranked[0].x:null;
}
function htmlSegments(html){if(!html)return [];
 var doc=new DOMParser().parseFromString(String(html),'text/html');doc.querySelectorAll('script,style,iframe,form,svg').forEach(x=>x.remove());
 var blocks=[...doc.querySelectorAll('li')];if(blocks.length===0)blocks=[...doc.querySelectorAll('p')];
 var content=blocks.map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(x=>x.length>=7&&x.length<=400);
 if(content.length===0){content=doc.body.textContent.split(/\n|[.;](?=\s)/).map(x=>x.trim()).filter(x=>x.length>=10&&x.length<=400);}
 return unique(content).slice(0,100);
}
function catalogFacts(product){return [...htmlSegments(product.descriptionLong),...htmlSegments(product.descriptionShort),...htmlSegments(product.specifications)].slice(0,110);}
function factAnswer(q,product){var label=topic(q);var variation=product.variations||{};
 if(label==='storage'||label==='ram'){
  var key=label==='ram'?'ram':'storage',arr=Array.isArray(variation[key])?variation[key].filter(Boolean).map(String):[];
  if(arr.length)return 'As opções cadastradas de '+(label==='ram'?'memória RAM':'armazenamento')+' são: '+arr.slice(0,10).join(', ')+'. Confira a disponibilidade da versão desejada.';
  var name=String(product.name||'');var match=label==='ram'?name.match(/\b(4|6|8|12|16|24|32)\s*GB\s*(?:de\s*)?RAM\b/i):name.match(/\b(64|128|256|512|1024)\s*GB\b/i);
  if(match)return 'O nome do produto informa '+match[1]+' GB de '+(label==='ram'?'RAM':'armazenamento')+'.';
 }
 if(/\b(?:cores|cor|coloracao)\b/.test(clean(q))){var cs=Array.isArray(variation.colors)?variation.colors.map(x=>String(x.name||'').trim()).filter(Boolean):[];
  if(cs.length)return 'As cores cadastradas são: '+cs.slice(0,12).join(', ')+'. Consulte a disponibilidade da cor desejada.';
 }
 if(/\b(?:marca|fabricante)\b/.test(clean(q))&&product.brand)return 'A marca cadastrada é '+String(product.brand).slice(0,80)+'.';
 if(!label)return null;
 var s=subjects.find(x=>x.key===label),facts=catalogFacts(product);if(!s)return null;
 var related=facts.map((sentence,index)=>({sentence,index,score:s.facts.reduce((v,p)=>v+(clean(sentence).includes(clean(p))?3:0),0)})).filter(x=>x.score>0);
 related.sort((a,b)=>b.score-a.score||a.index-b.index);
 if(!related.length)return null;
 var selected=related[0].sentence;
 // Never infer quantified autonomy, charge time, warranty, stock or compatibility from generic marketing claims.
 if(label==='battery'){
  var time=selected.match(/(?:\b\d+(?:[.,]\d+)?\s*(?:dias?|horas?|semanas?|meses?)\b)/i);
  if(!time){return 'O cadastro menciona a bateria, mas não informa uma autonomia exata em dias ou horas. Prefiro não estimar um número sem confirmação.';}
  return 'Segundo a descrição do produto: '+selected+'. A autonomia real depende das condições de uso.';
 }
 if(label==='water'){
  var rating=facts.join(' ').match(/\b(?:\d+\s*ATM|IP\s*\d{2})\b/i);
  if(rating)return 'A resistência à água informada no cadastro é '+rating[0].replace(/\s+/g,' ').toUpperCase()+'. Isso não significa proteção irrestrita contra água; respeite as orientações e limitações do fabricante.';
  if(!/agua|impermeavel/.test(clean(selected)))return null;
  return 'O cadastro informa: '+selected+'. Confira as orientações do fabricante antes de molhar o aparelho.';
 }
 if(label==='screen'&&/(?:tamanho|quantas|polegadas|medida|dimensao)/.test(clean(q))){
  var measures=related.find(x=>/\b\d+(?:[.,]\d+)?\s*(?:polegadas|pol|")\b/i.test(x.sentence));
  if(!measures)return 'O cadastro informa o tipo de tela, mas não especifica o tamanho em polegadas. Não consigo confirmar essa medida.';
  return 'Segundo a descrição do produto: '+measures.sentence.replace(/[.;]\s*$/,'')+'.';
 }
 if(label==='sport'){
  var found=related.find(x=>/\b\d+\b/.test(x.sentence));if(found)return 'A descrição do produto informa: '+found.sentence.replace(/[.;]\s*$/,'')+'.';
  return 'A descrição menciona modalidades esportivas, mas não confirma uma quantidade exata.';
 }
 if(label==='compatibility' && /\b(?:modelo|[a-z]{1,4}\d{2,}|\d{2,})\b/i.test(clean(q))){
  // Models are unsafe to infer from generic Android/iOS support.
  var asked=clean(q).match(/\b(?:[a-z]+\d+[a-z0-9]*|\d{2,})\b/g)||[];
  if(asked.length && !asked.every(x=>clean(selected).includes(x)))return null;
 }
 if(label==='included' && /nao|sem/.test(clean(selected)))return null;
 return 'Segundo a descrição do produto: '+selected.replace(/[.;]\s*$/,'')+'.';
}
// Responde à pergunta de condição apenas quando há informação explícita no produto.
// Nunca deduz "novo" simplesmente pela categoria ou por ausência da palavra "usado".
function conditionAnswer(q,product){
 var n=clean(q);
 if(!/\b(novo|nova|usado|usada|seminovo|seminova|lacrado|recondicionado|condicao|estado)\b/.test(n))return null;
 // "em bom estado" ou conservação geral não permite concluir novo/usado.
 if(/\b(estado|condicao)\b/.test(n) && !/\b(novo|usado|seminovo|lacrado|recondicionado)\b/.test(n) && !/\bproduto\b/.test(n))return null;
 var v=product.variations||{}, evidence=[];
 function read(value){
  if(Array.isArray(value)){value.forEach(read);return;}
  if(value&&typeof value==='object'){if(value.name||value.label||value.value)read(value.name||value.label||value.value);return;}
  var t=clean(value); if(!t)return;
  // Protege contra textos comerciais como "celulares novos e usados".
  if(/\b(novos?\s+e\s+usados?|usados?\s+e\s+novos?)\b/.test(t))return;
  if(/\b(usado|usada|seminovo|seminova|recondicionado)\b/.test(t))evidence.push('usado');
  if(/\b(novo|nova|lacrado|lacrada)\b/.test(t))evidence.push('novo');
 }
 read(product.condition);read(product.conditionText);read(product.productCondition);
 read(v.condition);read(v.conditionText);
 read(product.tags);read(product.badges);read(product.labels);
 // Nome é uma evidência forte, mas textos livres da descrição não são.
 read(product.name||product.nome);
 var hasNew=evidence.includes('novo'),hasUsed=evidence.includes('usado');
 if(hasNew&&hasUsed)return 'O cadastro apresenta informações de condição diferentes entre as opções. Confirme com a Quality se a unidade desejada é nova ou usada.';
 if(hasUsed)return 'Este produto está identificado como usado/seminovo no cadastro da Quality. Consulte o vendedor para confirmar os detalhes de conservação da unidade.';
 if(hasNew)return 'Este produto está identificado como novo no cadastro da Quality.';
 return null;
}
function b64(bytes){var s='';for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s);}
function unb64(s){var v=atob(s),r=new Uint8Array(v.length);for(var i=0;i<v.length;i++)r[i]=v.charCodeAt(i);return r;}
async function protect(raw,publicKey){if(!window.crypto||!crypto.subtle)throw new Error('Envio seguro indisponível neste navegador.');
 var key=await crypto.subtle.importKey('spki',unb64(publicKey),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 var aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);var iv=crypto.getRandomValues(new Uint8Array(12));
 var data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(raw))));
 var locked=new Uint8Array(await crypto.subtle.encrypt({name:'RSA-OAEP'},key,await crypto.subtle.exportKey('raw',aes)));
 return '__QQA1__'+JSON.stringify({v:1,k:b64(locked),i:b64(iv),d:b64(data)});
}
function isLocal(){return /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(location.hostname);}
async function sendQuestion(q,product){var data={id:'qa-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),slug:String(product.slug||product.id||''),productName:String(product.name||'').slice(0,160),question:q};
 if(isLocal()){
  // Local: a pergunta anonima e recebida pelo ERP sem exigir cadastro.
  var r=await fetch('/perguntas-produtos/public-submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin'});
  var j=await r.json().catch(()=>({}));if(!r.ok||!j.success)throw new Error(j.message||'Não foi possível enviar a pergunta.');return true;
 }
 var configResponse=await fetch('/supplier-form-public.json',{cache:'no-store'});if(!configResponse.ok)throw new Error('Recebimento temporariamente indisponível.');
 var config=await configResponse.json();if(!config.publicKey||!config.endpoint||!config.writeKey)throw new Error('Recebimento temporariamente indisponível.');
 var encrypted=await protect(data,config.publicKey),event='product_question_secure',timestamp=new Date().toISOString();
 await fetch(config.endpoint,{method:'POST',mode:'no-cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({key:config.writeKey,action:'track',event,type:event,Evento:event,at:timestamp,Data:timestamp,eventId:data.id,EventId:data.id,Produto:encrypted,SlugProduto:data.slug,Categoria:'Perguntas',Pagina:location.href}),keepalive:true});
 return false; // no-cors cannot prove delivery to remote service.
}
function formatAnsweredDate(raw){
 if(!raw)return '';
 var date=new Date(raw);if(Number.isNaN(date.getTime()))return '';
 return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
}
function renderHistory(holder,answers){
 holder.replaceChildren();if(!answers.length)return;
 var sorted=answers.slice().sort(function(a,b){
  // Perguntas antigas sem data seguem ordem original; a resposta nunca recebe data inventada.
  var first=Date.parse(a.answeredAt||'')||0,second=Date.parse(b.answeredAt||'')||0;return second-first;
 });
 holder.appendChild(el('h3','quality-pq-history-title','Últimas perguntas'));
 var list=el('div','quality-pq-history-list');holder.appendChild(list);
 var visible=2,limit=Math.min(sorted.length,20);
 function paint(){list.replaceChildren();sorted.slice(0,limit).forEach(function(x,i){
   var item=el('article','quality-pq-history-item'),question=el('h4','quality-pq-history-question',x.question),answer=el('p','quality-pq-history-answer',x.answer);
   if(i>=visible)item.hidden=true;
   item.append(question,answer);
   var date=formatAnsweredDate(x.answeredAt);if(date){
    var when=el('time','quality-pq-history-date',date);when.dateTime=x.answeredAt;when.setAttribute('aria-label','Resposta em '+date);item.appendChild(when);
   }
   list.appendChild(item);
 });}
 paint();
 if(limit>visible){var more=el('button','quality-pq-show-more','Ver todas as perguntas');more.type='button';more.setAttribute('aria-expanded','false');
  more.addEventListener('click',function(){var expand=more.getAttribute('aria-expanded')!=='true';visible=expand?limit:2;more.setAttribute('aria-expanded',String(expand));more.textContent=expand?'Mostrar menos':'Ver todas as perguntas';paint();});
  holder.appendChild(more);
 }
}
function feedbackUI(container,product,answerSource,onConsult){var area=el('div','quality-pq-help'),text=el('span','','Essa resposta ajudou?'),buttons=el('div','quality-pq-feedback');
 [['👍','Sim'],['👎','Não']].forEach(function(item){var b=el('button','',item[0]);b.type='button';b.setAttribute('aria-label',item[1]);b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{buttons.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));text.textContent='Obrigado pelo feedback!';try{var track=window.qualityAnalyticsTrack||window.QualityAnalytics?.track;if(typeof track==='function')track('product_question_feedback',{productId:product.id||product.slug,source:answerSource,helpful:item[1]==='Sim'});}catch(_){};});buttons.appendChild(b);});
 var consult=el('button','quality-pq-consult-link','Prefiro consultar o vendedor');
 consult.type='button';consult.addEventListener('click',onConsult);
 area.append(text,buttons,consult);container.appendChild(area);
}
async function mount(product,box){var slug=String(product.slug||product.id||'').trim();if(!slug||!box||document.querySelector('.quality-pq'))return;
 var block=el('section','quality-pq');block.setAttribute('aria-label','Perguntas e respostas do produto');block.appendChild(el('h2','','Perguntas e respostas'));
 var form=el('form','quality-pq-row'),wrapper=el('div','quality-pq-input-wrap'),input=el('input');input.type='text';input.minLength=4;input.maxLength=500;input.required=true;input.placeholder='Digite sua pergunta...';input.setAttribute('aria-label','Sua pergunta sobre este produto');input.autocomplete='off';
 var clear=el('button','quality-pq-clear','×');clear.type='button';clear.hidden=true;clear.setAttribute('aria-label','Limpar pergunta');clear.addEventListener('click',()=>{input.value='';clear.hidden=true;input.focus();});
 input.addEventListener('input',()=>{clear.hidden=!input.value;});wrapper.append(input,clear);
 var ask=el('button','quality-pq-ask','✦ Perguntar');ask.type='submit';form.append(wrapper,ask);block.appendChild(form);
 var output=el('div','quality-pq-output');output.hidden=true;output.setAttribute('role','status');output.setAttribute('aria-live','polite');block.appendChild(output);
 var success=el('div','quality-pq-success');success.hidden=true;success.setAttribute('role','status');block.appendChild(success);
 var history=el('div','quality-pq-history');history.hidden=true;block.appendChild(history);box.insertAdjacentElement('afterend',block);
 var knowledge=[],knowledgeSettings={approvedFaq:true,catalogFacts:true};
 try{var kb=await fetch('/content/quality-knowledge-public.json',{cache:'no-store'});if(kb.ok){var kd=await kb.json();knowledge=Array.isArray(kd.items)?kd.items.slice(0,500):[];knowledgeSettings=kd.settings||knowledgeSettings;}}catch(_){}
 var answers=[];try{var resp=await fetch('/content/quality-product-faq.json',{cache:'no-store'});if(resp.ok){var data=await resp.json();answers=(Array.isArray(data.items)?data.items:[]).filter(x=>x.slug===slug&&typeof x.answer==='string'&&typeof x.question==='string').slice(0,60);}}catch(_){}
 if(answers.length){history.hidden=false;renderHistory(history,answers);}
 var inProgress=false,lastSent='';
 async function submitForHuman(q){
  if(inProgress)return;
  if(lastSent===q){output.hidden=true;success.hidden=false;success.textContent='Sua pergunta já foi encaminhada à Quality.';return;}
  inProgress=true;ask.disabled=true;block.setAttribute('aria-busy','true');success.hidden=true;output.hidden=false;
  output.replaceChildren(el('div','quality-pq-response','Enviando sua pergunta...'));
  try{
   var confirmed=await sendQuestion(q,product);lastSent=q;output.hidden=true;output.replaceChildren();
   success.hidden=false;
   success.textContent=confirmed?'Sua pergunta foi enviada com sucesso.':'Sua pergunta foi encaminhada à Quality. O recebimento será confirmado após a sincronização.';
  }catch(error){output.hidden=false;output.replaceChildren(el('div','quality-pq-response',error.message||'Não foi possível enviar sua pergunta. Tente novamente.'));}
  finally{inProgress=false;ask.disabled=false;block.removeAttribute('aria-busy');}
 }
 function consultLink(q){
  var b=el('button','quality-pq-consult-link','Prefiro consultar o vendedor');b.type='button';
  b.addEventListener('click',function(){submitForHuman(q);});return b;
 }
 form.addEventListener('submit',function(ev){
  ev.preventDefault();var q=input.value.trim();if(q.length<4||inProgress)return;
  success.hidden=true;success.textContent='';output.hidden=false;output.replaceChildren();
  var found=knowledgeSettings.approvedFaq!==false?approvedMatch(q,answers):null;
  var kbResult=!found?knowledgeMatch(q,slug,knowledge):null;
  var fact=!found&&!kbResult&&knowledgeSettings.catalogFacts!==false?(conditionAnswer(q,product)||factAnswer(q,product)):null;
  if(found||kbResult||fact){
   var response=el('div','quality-pq-response'),answer=el('p','quality-pq-answer-text',found?found.answer:(kbResult?kbResult.answer:fact));
   var kind=el('div','quality-pq-answer-label',found?'✦ Resposta verificada pela Quality':(kbResult?'✦ Respondido por IA · Base de conhecimento verificada':'✦ Respondido por IA · Informações do catálogo'));
   response.append(answer,kind);output.appendChild(response);
   feedbackUI(output,product,found?'aprovada':(kbResult?'conhecimento':'catalogo'),function(){submitForHuman(q);});return;
  }
  var info=el('div','quality-pq-response','Ainda não encontrei uma resposta confirmada para esta dúvida.');
  var actions=el('div','quality-pq-help');actions.appendChild(consultLink(q));
  output.append(info,actions);
 });
}
window.QualityProductQuestions={version:'4.0',mount};
function autoMount(){var box=document.getElementById('produto-detalhe');if(!box||!window.QualityPublicCatalog||box.dataset.qualityPqObserved)return;
 box.dataset.qualityPqObserved='1';var key='';try{var parts=new URL(location.href).pathname.split('/').filter(Boolean),idx=parts.lastIndexOf('produto');key=idx>=0?decodeURIComponent(parts[idx+1]||''):new URL(location.href).searchParams.get('id')||'';}catch(_){}
 if(!key)return;window.QualityPublicCatalog.load().then(data=>{var product=(data.items||[]).find(x=>String(x.slug||'')===key||String(x.id||'')===key);if(!product)return;
  function ready(){if(box.querySelector('h1')){observer.disconnect();mount(product,box);}}var observer=new MutationObserver(ready);observer.observe(box,{childList:true,subtree:true});ready();
 }).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});else autoMount();
})();
