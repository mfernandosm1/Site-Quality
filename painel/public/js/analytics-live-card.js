(function(){
  function money(n){ return Number(n||0).toLocaleString('pt-BR'); }
  function esc(v){ return (v||'').toString().replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function line(item, field, fallback){
    var name = esc(item.name || item.slug || item.term || item.url || fallback || 'Sem nome');
    var val = money(item[field] || item.total || item.score || 0);
    return '<div class="qa-row"><span>'+name+'</span><b>'+val+'</b></div>';
  }
  function box(title, arr, field, empty){
    return '<div class="qa-box"><h4>'+title+'</h4>' + (arr && arr.length ? arr.slice(0,5).map(function(i){ return line(i, field); }).join('') : '<p class="qa-empty">'+empty+'</p>') + '</div>';
  }
  function render(summary, full){
    summary = summary || {};
    var c = summary.counters || {};
    var hot = (summary.hot && summary.hot[0]) ? summary.hot[0] : null;
    var html = '<style>.qa-live-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}.qa-kpi{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px}.qa-kpi strong{display:block;font-size:22px}.qa-kpi span{font-size:12px;color:#555}.qa-smart{margin-top:12px;background:linear-gradient(135deg,#fff7ed,#eff6ff);border:1px solid #fde68a;border-radius:14px;padding:13px}.qa-box-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.qa-box{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px}.qa-box h4{margin:0 0 8px}.qa-row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #eee;padding:6px 0;font-size:13px}.qa-row:last-child{border-bottom:0}.qa-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qa-empty{font-size:13px;color:#777}.qa-dot{display:inline-block;width:8px;height:8px;background:#16a34a;border-radius:50%;margin-right:6px}@media(max-width:900px){.qa-live-grid,.qa-box-grid{grid-template-columns:1fr}}</style>';
    html += '<div class="qa-live-grid">';
    html += '<div class="qa-kpi"><strong>'+money(c.product_view)+'</strong><span>👁 produtos vistos</span></div>';
    html += '<div class="qa-kpi"><strong>'+money(c.favorite)+'</strong><span>❤️ favoritos</span></div>';
    html += '<div class="qa-kpi"><strong>'+money(c.whatsapp_click)+'</strong><span>💬 cliques WhatsApp</span></div>';
    html += '<div class="qa-kpi"><strong>'+money(c.category_view)+'</strong><span>📈 categorias acessadas</span></div>';
    html += '</div>';
    html += '<div class="qa-smart"><b><span class="qa-dot"></span>Ao vivo</b><br>';
    if(hot){ html += '🔥 Produto em destaque agora: <b>'+esc(hot.name || hot.slug)+'</b> — score '+money(hot.score)+'. Recomendo observar para Story/oferta.'; }
    else { html += 'Ainda sem dados. Abra produtos, favorite e clique no WhatsApp para alimentar o painel.'; }
    html += '<div style="font-size:12px;color:#555;margin-top:6px">Última atualização: '+esc(summary.updatedAt || '')+'</div></div>';
    html += '<div class="qa-box-grid">';
    html += box('👁 Mais vistos', summary.productsMostViewed, 'views', 'Sem visualizações ainda.');
    html += box('❤️ Mais favoritados', summary.productsMostFavorited, 'favorites', 'Sem favoritos ainda.');
    html += box('💬 Mais WhatsApp', summary.productsMostWhatsapp, 'whatsapp', 'Sem cliques ainda.');
    html += box('📂 Categorias', summary.categoriesMostViewed, 'views', 'Sem categorias ainda.');
    if(full){
      html += box('🔎 Buscas', summary.searches, 'total', 'Sem buscas ainda.');
      html += box('⚠ Muito visto sem WhatsApp', summary.attention, 'views', 'Sem alertas ainda.');
    }
    html += '</div>';
    return html;
  }
  function ensureDashboardCard(){
    if(location.pathname !== '/' && location.pathname !== '') return null;
    var row = document.querySelector('.container .row') || document.querySelector('.row');
    if(!row) return null;
    var card = document.getElementById('qa-dashboard-card');
    if(!card){
      card = document.createElement('div');
      card.className = 'card';
      card.id = 'qa-dashboard-card';
      card.style.gridColumn = '1 / -1';
      card.innerHTML = '<h3>📊 Inteligência da Loja</h3><p class="muted">Dados em tempo real do site.</p><div id="qa-dashboard-live"></div><p><a href="/analytics">Abrir analytics completo</a></p>';
      row.appendChild(card);
    }
    return document.getElementById('qa-dashboard-live');
  }
  function target(){ return document.getElementById('analytics-live-full') || ensureDashboardCard(); }
  async function update(){
    var el = target(); if(!el) return;
    try{
      var r = await fetch('/analytics/summary?ts=' + Date.now(), {cache:'no-store'});
      var j = await r.json();
      el.innerHTML = render(j.summary || {}, !!window.QualityAnalyticsFullPage || !!document.getElementById('analytics-live-full'));
    }catch(e){ el.innerHTML = '<p class="qa-empty">Analytics ainda não disponível.</p>'; }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ update(); setInterval(update, 1000); });
  else { update(); setInterval(update, 1000); }
})();
