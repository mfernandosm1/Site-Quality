(function(global){
  'use strict';
  function normalize(value){
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }
  function tokens(value){ return normalize(value).split(/\s+/).filter(Boolean); }
  function matches(haystack, query){
    const q=tokens(query); if(!q.length) return true;
    const h=tokens(haystack); if(!h.length) return false;
    return q.every(qt=>h.some(ht=>qt.length>=3?ht.includes(qt):ht.startsWith(qt)));
  }
  global.QualitySearch={normalize,tokens,matches};
})(window);
