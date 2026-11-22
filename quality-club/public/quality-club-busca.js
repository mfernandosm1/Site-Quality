/** Public search: no private compatibility data is shipped to anonymous visitors. */
export function initQualityClubSearch({ client } = {}) {
  const form=document.getElementById('qc-public-form');
  const input=document.getElementById('qc-public-input');
  const target=document.getElementById('qc-public-results');
  if(!form||!input||!target)return;
  const submit=form.querySelector('button[type="submit"]');
  let catalog=null;
  let sequence=0;

  function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
  function el(tag,cls,content){const e=document.createElement(tag);if(cls)e.className=cls;if(content!=null)e.textContent=String(content);return e;}
  function clear(){target.replaceChildren();}
  function loading(){clear();target.append(el('div','qc-public-loading','Consultando...'));}
  function unknown(){clear();target.append(el('div','qc-public-empty','Nenhum modelo encontrado.'));}
  function problem(){clear();target.append(el('div','qc-public-empty','Consulta indisponível no momento.'));}
  function render(rows){
    clear();
    if(!rows.length){unknown();return;}
    const table=el('div','qc-public-table');
    const head=el('div','qc-public-table-head');head.append(el('span','', 'Modelo do aparelho'),el('span','','Películas 3D compatíveis'));table.append(head);
    rows.forEach(({name,free,compat})=>{
      const row=el('div','qc-public-table-row');
      row.append(el('span','qc-public-model',name));
      if(free) {
        const value=el('span','qc-public-free',Array.isArray(compat)&&compat.length?compat.join(' · '):'Sem informação cadastrada');
        row.append(value);
      }else{
        row.append(el('span','qc-public-locked','Disponível apenas na tabela VIP'));
      }
      table.append(row);
    });
    target.append(table);
  }
  const parseError=async error =>{
    if(!error) return null;
    try{if(error.context?.json) return await error.context.json();}catch{}
    return null;
  };
  const ready=fetch('/quality-club-catalogo.json',{cache:'no-store'}).then(async r=>{
    if(!r.ok)throw new Error('catalog unavailable');
    const parsed=await r.json();
    if(!Array.isArray(parsed.models)||!parsed.free||typeof parsed.free!=='object')throw new Error('bad catalog');
    catalog=parsed;
  });
  async function run(q){
    const serial=++sequence;
    loading();submit.disabled=true;
    try {
      await ready;
      if(serial!==sequence)return;
      const term=normalize(q);
      if(term.length<2){clear();target.append(el('div','qc-public-empty','Digite pelo menos 2 caracteres.'));return;}
      const matches=catalog.models.filter(m=>normalize(m.name).includes(term)||(m.aliases||[]).some(a=>normalize(a).includes(term)));
      matches.sort((a,b)=>{
        const ka=normalize(a.name),kb=normalize(b.name);
        const pa=ka===term?0:(ka.startsWith(term)?1:2);
        const pb=kb===term?0:(kb.startsWith(term)?1:2);
        return pa-pb || ka.localeCompare(kb,'pt-BR');
      });
      // Existing entitlement and JWT validation still reside in the original Edge Function.
      // A logged-in paid user receives its real results, never local VIP relationship data.
      if(client){
        try {
          const {data:sessionData}=await client.auth.getSession();
          if(sessionData?.session){
            const {data,error}=await client.functions.invoke('quality-club-search',{body:{action:'search',q:q.trim()}});
            if(serial!==sequence)return;
            if(!error && data?.ok && Array.isArray(data.results)) {
              render(data.results.map(item=>({name:item.name,free:true,compat:Array.isArray(item.screens)?item.screens:[]})));
              return;
            }
            const detail=data?.code?data:await parseError(error);
            const code=detail?.code;
            if(code && !['NO_PLAN','UNAUTHENTICATED','EMAIL_UNVERIFIED'].includes(code)){problem();return;}
            if(error&&!code){problem();return;}
          }
        }catch{problem();return;}
      }
      // Anon + non-subscribers: display only free films from vetted import rows.
      render(matches.slice(0,40).map(item=>({name:item.name,free:Object.hasOwn(catalog.free,item.name),compat:catalog.free[item.name]||[]})));
    }catch{if(serial===sequence)problem();}
    finally{if(serial===sequence)submit.disabled=false;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();run(input.value);});
}
