(function qualityHomeMarketplaceV14(){
  'use strict';
  if (window.__qualityHomeMarketplaceV14) return;
  window.__qualityHomeMarketplaceV14 = true;

  var main = document.querySelector('.quality-home-main');
  if (!main) return;

  function norm(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function categoryOf(product){
    return norm(product && (product.category || product.categoria || product.categorySlug || product.categoriaSlug || (product.virtualStore && product.virtualStore.category))).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
  function active(product){
    if (!product) return false;
    var virtualActive = product.virtualStore && product.virtualStore.active;
    if (virtualActive !== undefined) return virtualActive !== false;
    return product.active !== false;
  }
  function physical(product){
    if (!active(product)) return false;
    var category = categoryOf(product);
    return category !== 'assistencia-tecnica' && category !== 'assistencia' && !category.includes('assistencia');
  }
  function key(product){
    return norm(product && (product.slug || product.id || product._id || product.name || product.nome));
  }
  function canonicalBrand(value){
    var source = String(value || '').trim();
    if (!source) return '';
    var k = norm(source).replace(/[^a-z0-9]/g,'');
    var known = {
      apple:'Apple', samsung:'Samsung', motorola:'Motorola', xiaomi:'Xiaomi', jbl:'JBL',
      amazfit:'Amazfit', nintendo:'Nintendo', sony:'Sony', kaidi:'Kaidi', c3tech:'C3Tech',
      sandisk:'SanDisk', intelbras:'Intelbras', epson:'Epson', hp:'HP', lenovo:'Lenovo', acer:'Acer', lg:'LG', wap:'WAP'
    };
    return known[k] || source.replace(/\b\w/g,function(c){ return c.toUpperCase(); });
  }
  function brandOf(product){
    var explicit = product && (product.brand || (product.erp && product.erp.brand) || (product.virtualStore && product.virtualStore.brand));
    if (explicit && !/^(sem\s*marca|semmarca)$/i.test(String(explicit).trim())) return canonicalBrand(explicit);

    var name = norm(product && (product.name || product.nome));
    if (!name) return '';

    // Fabricantes presentes no próprio nome têm prioridade sobre compatibilidades como “para iPhone”.
    var direct = [
      [/\bkaidi\b/,'Kaidi'], [/\bc3\s*tech\b|\bc3tech\b/,'C3Tech'], [/\bsandisk\b/,'SanDisk'],
      [/\bjbl\b/,'JBL'], [/\bamazfit\b/,'Amazfit'], [/\bnintendo\b/,'Nintendo'], [/\bintelbras\b/,'Intelbras'],
      [/\bepson\b/,'Epson'], [/\blenovo\b/,'Lenovo'], [/\bacer\b/,'Acer'], [/\bwap\b/,'WAP'], [/\bsony\b/,'Sony']
    ];
    for (var i=0;i<direct.length;i++) if (direct[i][0].test(name)) return direct[i][1];

    if (/^(iphone|ipad|macbook|apple watch|airpods)\b|^apple\b/.test(name)) return 'Apple';
    if (/^(samsung|galaxy)\b/.test(name)) return 'Samsung';
    if (/^(motorola|moto)\b/.test(name)) return 'Motorola';
    if (/^(xiaomi|redmi|poco)\b/.test(name)) return 'Xiaomi';
    if (/^lg\b/.test(name)) return 'LG';
    if (/^hp\b|hewlett/.test(name)) return 'HP';
    return '';
  }
  function enabled(name){
    var prop = 'home' + name.charAt(0).toUpperCase() + name.slice(1) + 'Enabled';
    return main.dataset[prop] !== 'false';
  }
  function limit(name, fallback){
    var prop = 'home' + name.charAt(0).toUpperCase() + name.slice(1) + 'Limit';
    var n = Number(main.dataset[prop] || fallback);
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : fallback;
  }
  function section(name){ return main.querySelector('[data-home-section="' + name + '"]'); }
  function visible(name, show){ var el=section(name); if(el) el.hidden=!show; }
  function assetPath(path){
    if (!path) return '/images/sem-imagem.png';
    if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path)) return path;
    return '/' + String(path).replace(/^\/+/, '');
  }
  function hasGallery(product){ return Array.isArray(product && product.gallery) && product.gallery.filter(Boolean).length > 0; }
  function showPrice(product){
    var raw = product && (product.showPrice ?? product.mostrar_preco ?? product.show_price ?? product.mostrarPreco ?? product.priceVisible ?? false);
    if (raw === true) return true;
    return /^(sim|yes|true|1|on)$/i.test(String(raw || ''));
  }
  function productUrl(product){
    var slug = product && (product.slug || product.id || product._id);
    return slug ? '/produto/' + encodeURIComponent(String(slug)) + '/' : '#';
  }
  function card(product){
    var name = product.name || product.nome || 'Produto';
    var detailUrl = productUrl(product);
    var canOpen = !!(product.detailsEnabled || hasGallery(product) || detailUrl !== '#');
    var actions = typeof window.qualityProductActionsHtml === 'function' ? window.qualityProductActionsHtml(product, detailUrl) : '';
    var tags = typeof window.productTagsHtml === 'function' ? window.productTagsHtml(product,2) : '';
    var variations = typeof window.productVariationsCardHtml === 'function' ? window.productVariationsCardHtml(product) : '';
    var price = showPrice(product) ? '<p>R$ ' + (Number(product.price)||0).toFixed(2).replace('.',',') + '</p>' : '';
    return '<div class="produto-card product-card" data-home-product="' + esc(key(product)) + '">' +
      '<div class="quality-card-image-wrap">' + actions + tags +
      (canOpen ? '<a class="quality-card-image-link" href="' + esc(detailUrl) + '" aria-label="Ver detalhes de ' + esc(name) + '">' : '') +
      '<img src="' + esc(assetPath(product.image || product.imagem)) + '" alt="' + esc(name) + '" loading="lazy" decoding="async" draggable="false" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';">' +
      (canOpen ? '</a>' : '') + '</div>' +
      '<h3>' + esc(name) + '</h3>' + variations + price +
      (canOpen ? '<a href="' + esc(detailUrl) + '" class="btn btn-details">Ver detalhes</a>' : '') +
      '<a href="https://wa.me/5555991407824?text=' + encodeURIComponent('Olá! Vim através do site e tenho interesse em ' + name) + '" class="btn" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp</a>' +
      '</div>';
  }
  function renderTrack(id, products){
    var track=document.getElementById(id);
    if (!track) return 0;
    track.innerHTML=products.map(card).join('');
    if (window.qualityUpdateFavoriteButtons) try { window.qualityUpdateFavoriteButtons(); } catch(_) {}
    if (window.qualityEnhanceStorefront) try { window.qualityEnhanceStorefront(); } catch(_) {}
    return products.length;
  }
  function dominantCategory(products){
    var counts={};
    products.forEach(function(p){ var c=categoryOf(p); if(c) counts[c]=(counts[c]||0)+1; });
    return Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; })[0] || 'smartphones';
  }
  function categoryHref(category, brand){
    var allowed = ['smartphones','acessorios','eletronicos','assistencia-tecnica'];
    var cat = allowed.includes(category) ? category : 'smartphones';
    return '/' + cat + '/?marca=' + encodeURIComponent(norm(brand));
  }
  function brandMark(brand){
    if (brand === 'Apple') return '<i class="fa-brands fa-apple"></i>';
    var short = brand.length <= 4 ? brand : brand.slice(0,1);
    return '<span>' + esc(short) + '</span>';
  }
  function renderBrands(items){
    var host=document.getElementById('home-brands-grid');
    if (!host || !enabled('brands')) { visible('brands',false); return; }
    var groups=new Map();
    items.filter(physical).forEach(function(product){
      var brand=brandOf(product); if(!brand) return;
      if(!groups.has(brand)) groups.set(brand,[]);
      groups.get(brand).push(product);
    });
    var preferred=['Apple','Samsung','Motorola','Xiaomi','JBL'];
    var brands=Array.from(groups.keys()).sort(function(a,b){
      var ai=preferred.indexOf(a), bi=preferred.indexOf(b);
      if(ai!==-1 || bi!==-1){ if(ai===-1)return 1;if(bi===-1)return -1;return ai-bi; }
      return groups.get(b).length-groups.get(a).length || a.localeCompare(b,'pt-BR');
    }).slice(0,limit('brands',8));
    host.innerHTML=brands.map(function(brand){
      var list=groups.get(brand); var cat=dominantCategory(list);
      return '<a class="quality-home-brand-card" href="' + esc(categoryHref(cat,brand)) + '">' +
        '<span class="quality-home-brand-mark">' + brandMark(brand) + '</span>' +
        '<span class="quality-home-brand-copy"><strong>' + esc(brand) + '</strong><small>' + list.length + (list.length===1?' produto':' produtos') + '</small></span>' +
        '<i class="fa-solid fa-chevron-right"></i></a>';
    }).join('');
    visible('brands',brands.length>0);
  }
  function productNumber(product){
    var code=String(product && (product.code || product.codigo || '') || '');
    var m=code.match(/(\d+)/g); if(m&&m.length) return Number(m[m.length-1])||0;
    var id=String(product && product.id || '');
    if (/^\d{12,14}$/.test(id)) return Number(id) || 0;
    m=id.match(/PRD-(\d+)/i); if(m){ var n=Number(m[1]); if(n<1000000)return n; }
    return 0;
  }
  function timeScore(product){
    var raw=product && (product.createdAt || product.publishedAt || product.updatedAt);
    var ts=raw ? Date.parse(raw) : NaN;
    return Number.isFinite(ts) ? ts : 0;
  }
  function newest(items){
    return items.filter(physical).slice().sort(function(a,b){
      var an=productNumber(a), bn=productNumber(b);
      if(an!==bn) return bn-an;
      return timeScore(b)-timeScore(a);
    });
  }
  function tokens(product){
    var ignored=new Set(['para','com','sem','novo','nova','usado','usada','gb','ram','dual','sim','celular','smartphone','original','preto','branco','azul','verde','rosa']);
    return norm(product && (product.name || product.nome)).split(/[^a-z0-9]+/).filter(function(t){return t.length>=3&&!ignored.has(t);});
  }
  function kind(product){
    var name=norm(product && (product.name || product.nome));
    var cat=categoryOf(product);
    if(cat==='smartphones') return 'smartphone';
    if(/capa|capinha|case/.test(name))return 'case';
    if(/pelicula/.test(name))return 'protector';
    if(/carregador|fonte|adaptador.*usb/.test(name))return 'charger';
    if(/\bcabo\b/.test(name))return 'cable';
    if(/power bank|magsafe|bateria magnetica/.test(name))return 'powerbank';
    if(/fone|headset|buds|caixa de som|boombox/.test(name))return 'audio';
    if(/watch|smartwatch|relogio|amazfit/.test(name))return 'watch';
    return cat||'other';
  }
  function recommendationScore(recent, candidate){
    if(!physical(candidate)) return -999;
    var candidateKey=key(candidate);
    if(recent.some(function(r){return key(r)===candidateKey;})) return -999;
    var best=-999;
    recent.slice(0,8).forEach(function(viewed,index){
      var score=0;
      var vc=categoryOf(viewed), cc=categoryOf(candidate);
      var vb=brandOf(viewed), cb=brandOf(candidate);
      if(vc && cc && vc===cc) score+=55;
      if(vb && cb && norm(vb)===norm(cb)) score+=60;
      var vk=kind(viewed), ck=kind(candidate);
      if(vk===ck) score+=24;
      var vt=tokens(viewed), ct=tokens(candidate);
      vt.forEach(function(t){if(ct.includes(t))score+=9;});
      if(vk==='smartphone' && ['case','protector','charger','cable','powerbank','audio'].includes(ck)) score+=20;
      if(candidate.featured) score+=5;
      score+=Math.max(0,8-index);
      if(score>best)best=score;
    });
    return best;
  }
  function fullRecent(items){
    var saved=[];
    try { saved=JSON.parse(localStorage.getItem('quality_vistos_recentemente_v811')||'[]'); } catch(_) {}
    var map=new Map(items.map(function(p){return [key(p),p];}));
    var result=[];
    saved.forEach(function(item){
      var full=map.get(key(item));
      if(full && physical(full) && !result.some(function(x){return key(x)===key(full);})) result.push(full);
    });
    return result;
  }
  function renderRecommended(items){
    if(!enabled('recommended')){visible('recommended',false);return;}
    var recent=fullRecent(items);
    if(!recent.length){visible('recommended',false);return;}
    var ranked=items.map(function(product){return {product:product,score:recommendationScore(recent,product)};})
      .filter(function(row){return row.score>=40;})
      .sort(function(a,b){return b.score-a.score || productNumber(b.product)-productNumber(a.product);})
      .slice(0,limit('recommended',10)).map(function(row){return row.product;});
    if(!ranked.length){visible('recommended',false);return;}
    var title=document.getElementById('home-recommended-title');
    if(title){
      var base=title.dataset.baseTitle || title.textContent.trim() || 'Mais produtos selecionados para você';
      if (!base || base === 'Você pode gostar' || /^Mais produtos\s+.+\s+para você$/i.test(base)) {
        base = 'Mais produtos selecionados para você';
      }
      title.dataset.baseTitle=base;
      title.textContent=base;
    }
    var count=renderTrack('home-recommended-track',ranked);
    visible('recommended',count>0);
  }

  var promise=window.__qualityHomeCatalogPromise || fetch('/content/products.json',{cache:'no-store'}).then(function(r){return r.json();});
  promise.then(function(data){
    var items=Array.isArray(data && data.items)?data.items:[];
    renderBrands(items);
    if(enabled('new')){
      var count=renderTrack('home-new-track',newest(items).slice(0,limit('new',10)));
      visible('new',count>0);
    } else visible('new',false);
    renderRecommended(items);
  }).catch(function(){
    visible('brands',false);visible('new',false);visible('recommended',false);
  });
})();
