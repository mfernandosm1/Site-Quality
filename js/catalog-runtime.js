/* Quality Public Catalog Runtime — 09/10/2026
 * Um único download por página, revalidação HTTP (304) e nova tentativa após falha.
 * Nunca usa a base privada content/products.json como fallback.
 */
(function(){
  'use strict';
  if (window.QualityPublicCatalog) return;
  var inflight = null;
  var inPanelPreview = /^\/site\//.test(location.pathname || '');
  var urls = inPanelPreview ? ['/site/content/catalog-public.json', '/content/catalog-public.json'] : ['/content/catalog-public.json', '/site/content/catalog-public.json'];
  async function download(){
    var error;
    for (var i=0; i<urls.length; i++) {
      try {
        var response = await fetch(urls[i], {cache:'no-cache', credentials:'same-origin'});
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        if (!data || !Array.isArray(data.items)) throw new Error('Formato de catálogo inválido');
        // Segunda barreira: se um arquivo interno foi publicado por engano, não o utiliza.
        if (data.items.some(function(item){
          return item && ('erp' in item || 'inventory' in item || 'commercial' in item || 'costPrice' in item || 'barcode' in item);
        })) throw new Error('Catálogo contém campos internos');
        return data;
      } catch (err) { error = err; }
    }
    throw error || new Error('Catálogo público indisponível');
  }
  function load(force){
    if (force) inflight = null;
    if (!inflight) {
      inflight = download().catch(function(err){ inflight = null; throw err; });
    }
    return inflight;
  }
  window.QualityPublicCatalog = Object.freeze({load:load, retry:function(){ return load(true); }});
})();
