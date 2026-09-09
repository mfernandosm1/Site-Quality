(function(){
  'use strict';
  var params;
  try { params = new URLSearchParams(location.search); } catch (_) { return; }
  if (params.get('trace') !== '1') return;
  if (window.__qualityCategoryTraceV1) return;
  window.__qualityCategoryTraceV1 = true;

  var startedAt = Date.now();
  var events = [];
  var groups = Object.create(null);
  var maxEvents = 250;

  function now(){
    var d = new Date();
    return d.toLocaleTimeString('pt-BR', {hour12:false}) + '.' + String(d.getMilliseconds()).padStart(3,'0');
  }

  function cleanStack(stack){
    return String(stack || '')
      .split('\n')
      .filter(function(line){ return line.indexOf('category-trace.js') === -1 && line.indexOf('Error') !== 0; })
      .slice(0, 8)
      .join('\n');
  }

  function firstFrame(stack){
    var lines = String(stack || '').split('\n');
    for (var i=0;i<lines.length;i++) {
      var line = lines[i].trim();
      if (!line || line.indexOf('category-trace.js') !== -1 || line === 'Error') continue;
      return line.replace(/^at\s+/, '');
    }
    return '(sem frame)';
  }

  function nodeLabel(node){
    if (!node) return 'null';
    if (node === document) return 'document';
    if (node === window) return 'window';
    if (node.nodeType === 3) return '#text';
    var tag = (node.tagName || node.nodeName || '?').toString().toLowerCase();
    var id = node.id ? '#' + node.id : '';
    var cls = '';
    try {
      if (node.classList && node.classList.length) cls = '.' + Array.prototype.slice.call(node.classList,0,3).join('.');
    } catch (_) {}
    return tag + id + cls;
  }

  function navRelated(node){
    if (!node || node === document || node === window) return false;
    try {
      if (node.nodeType === 3) node = node.parentElement;
      if (!node || node.nodeType !== 1) return false;
      if (node.id === 'nav-desktop' || node.id === 'nav-mobile' || node.id === 'mobile-menu' || node.id === 'menu-overlay' || node.id === 'menu-toggle' || node.id === 'menu-close') return true;
      if (node.matches && node.matches('.nav-desktop,.mobile-nav,.mobile-menu,.menu-overlay,.cat-menu-group,.cat-submenu,.cat-mobile-group,.quality-favorites-menu-link')) return true;
      if (node.closest && node.closest('#nav-desktop,#nav-mobile,#mobile-menu,.nav-desktop,.mobile-nav,.mobile-menu,.cat-menu-group,.cat-submenu')) return true;
      if (node.querySelector && node.querySelector('#nav-desktop,#nav-mobile,#mobile-menu,.nav-desktop,.mobile-nav,.mobile-menu,.cat-menu-group,.cat-submenu')) return true;
    } catch (_) {}
    return false;
  }

  function record(kind, node, detail, stackOverride){
    var stack = cleanStack(stackOverride || (new Error()).stack);
    var frame = firstFrame(stack);
    var key = kind + '|' + frame + '|' + String(detail || '').slice(0,120);
    if (!groups[key]) groups[key] = {kind:kind, frame:frame, detail:String(detail||''), count:0, sampleStack:stack};
    groups[key].count++;
    events.push({t:now(), kind:kind, node:nodeLabel(node), detail:String(detail||''), frame:frame});
    if (events.length > maxEvents) events.shift();
    scheduleRender();
  }

  function patchMethod(proto, name, nodeArgIndex, detailFn){
    if (!proto || !proto[name] || proto[name].__qualityTraceWrapped) return;
    var original = proto[name];
    function wrapped(){
      var target = this;
      var related = navRelated(target);
      if (!related && nodeArgIndex != null && arguments[nodeArgIndex]) related = navRelated(arguments[nodeArgIndex]);
      if (related) {
        var detail = '';
        try { detail = detailFn ? detailFn.apply(this, arguments) : name; } catch (_) { detail = name; }
        record('DOM.' + name, target, detail);
      }
      return original.apply(this, arguments);
    }
    wrapped.__qualityTraceWrapped = true;
    try { proto[name] = wrapped; } catch (_) {}
  }

  patchMethod(Node.prototype, 'appendChild', 0, function(n){ return 'child=' + nodeLabel(n); });
  patchMethod(Node.prototype, 'insertBefore', 0, function(n){ return 'node=' + nodeLabel(n); });
  patchMethod(Node.prototype, 'removeChild', 0, function(n){ return 'child=' + nodeLabel(n); });
  patchMethod(Node.prototype, 'replaceChild', 0, function(n,o){ return 'new=' + nodeLabel(n) + ' old=' + nodeLabel(o); });
  patchMethod(Element.prototype, 'replaceChildren', 0, function(){ return 'count=' + arguments.length; });
  patchMethod(Element.prototype, 'insertAdjacentHTML', null, function(pos,html){ return pos + ' html=' + String(html||'').slice(0,100); });
  patchMethod(Element.prototype, 'insertAdjacentElement', 1, function(pos,el){ return pos + ' el=' + nodeLabel(el); });
  patchMethod(Element.prototype, 'setAttribute', null, function(name,val){ return name + '=' + String(val).slice(0,100); });
  patchMethod(Element.prototype, 'removeAttribute', null, function(name){ return name; });
  patchMethod(Element.prototype, 'toggleAttribute', null, function(name,force){ return name + ' force=' + force; });

  function patchSetter(proto, prop){
    if (!proto) return;
    var desc;
    try { desc = Object.getOwnPropertyDescriptor(proto, prop); } catch (_) {}
    if (!desc || !desc.set || desc.set.__qualityTraceWrapped) return;
    var originalSet = desc.set;
    var originalGet = desc.get;
    function setter(value){
      if (navRelated(this)) record('SET.' + prop, this, String(value).slice(0,120));
      return originalSet.call(this, value);
    }
    setter.__qualityTraceWrapped = true;
    try { Object.defineProperty(proto, prop, {configurable:desc.configurable, enumerable:desc.enumerable, get:originalGet, set:setter}); } catch (_) {}
  }
  patchSetter(Element.prototype, 'innerHTML');
  patchSetter(Element.prototype, 'outerHTML');
  patchSetter(Element.prototype, 'className');
  patchSetter(HTMLElement.prototype, 'hidden');

  if (window.MutationObserver) {
    var NativeMO = window.MutationObserver;
    function TracedMO(callback){
      var creationStack = cleanStack((new Error()).stack);
      var wrapped = function(mutations, observer){
        var hit = false;
        for (var i=0;i<mutations.length;i++) {
          var m = mutations[i];
          if (navRelated(m.target) || navRelated(m.addedNodes && m.addedNodes[0]) || navRelated(m.removedNodes && m.removedNodes[0])) { hit = true; break; }
        }
        if (hit) record('MutationObserver.callback', mutations[0] && mutations[0].target, 'mutations=' + mutations.length + ' observer criado em ' + firstFrame(creationStack), creationStack);
        return callback.apply(this, arguments);
      };
      var obs = new NativeMO(wrapped);
      try { obs.__qualityTraceCreationStack = creationStack; } catch (_) {}
      return obs;
    }
    TracedMO.prototype = NativeMO.prototype;
    try { Object.setPrototypeOf(TracedMO, NativeMO); } catch (_) {}
    try { window.MutationObserver = TracedMO; } catch (_) {}
  }

  var nativeSetInterval = window.setInterval;
  window.setInterval = function(fn, delay){
    var registration = cleanStack((new Error()).stack);
    var wrapped = typeof fn === 'function' ? function(){
      var before = events.length;
      var result = fn.apply(this, arguments);
      if (events.length > before) record('TIMER.interval', document.body, 'delay=' + delay + ' registrado em ' + firstFrame(registration), registration);
      return result;
    } : fn;
    return nativeSetInterval(wrapped, delay);
  };

  var nativeSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay){
    var registration = cleanStack((new Error()).stack);
    var wrapped = typeof fn === 'function' ? function(){
      var before = events.length;
      var result = fn.apply(this, arguments);
      if (events.length > before && Number(delay||0) <= 2000) record('TIMER.timeout', document.body, 'delay=' + delay + ' registrado em ' + firstFrame(registration), registration);
      return result;
    } : fn;
    return nativeSetTimeout(wrapped, delay);
  };

  ['pointerdown','pointerup','click','touchstart','touchend','mouseenter','mouseleave'].forEach(function(type){
    document.addEventListener(type, function(ev){
      var target = ev.target;
      if (!target || !target.closest) return;
      var hit = target.closest('#nav-desktop,#nav-mobile,#mobile-menu,#menu-toggle,#menu-close,.cat-menu-group,.cat-submenu');
      if (!hit) return;
      var top = null;
      try { if (ev.clientX != null && ev.clientY != null) top = document.elementFromPoint(ev.clientX, ev.clientY); } catch (_) {}
      events.push({t:now(), kind:'EVENT.'+type, node:nodeLabel(target), detail:'top=' + nodeLabel(top) + ' prevented=' + !!ev.defaultPrevented, frame:''});
      if (events.length > maxEvents) events.shift();
      scheduleRender();
    }, true);
  });

  var panel, pre, summary, timer;
  function ensurePanel(){
    if (panel || !document.body) return;
    panel = document.createElement('div');
    panel.id = 'quality-trace-panel';
    panel.style.cssText = 'position:fixed;z-index:2147483647;right:8px;bottom:8px;width:min(780px,96vw);max-height:58vh;background:#090909;color:#e8e8e8;border:2px solid #f33;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.45);font:12px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;display:flex;flex-direction:column;';
    panel.innerHTML = '<div style="display:flex;gap:8px;align-items:center;padding:8px;background:#171717;position:sticky;top:0"><strong style="color:#ff6868">TRACE CATEGORIAS</strong><span id="quality-trace-summary"></span><button id="quality-trace-copy" type="button" style="margin-left:auto;padding:5px 9px">Copiar</button><button id="quality-trace-clear" type="button" style="padding:5px 9px">Limpar</button></div><pre id="quality-trace-pre" style="margin:0;padding:9px;overflow:auto;white-space:pre-wrap;word-break:break-word"></pre>';
    document.body.appendChild(panel);
    pre = panel.querySelector('#quality-trace-pre');
    summary = panel.querySelector('#quality-trace-summary');
    panel.querySelector('#quality-trace-copy').onclick = function(){
      var text = buildReport();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function(){});
      else { var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
    };
    panel.querySelector('#quality-trace-clear').onclick = function(){ events.length=0; groups=Object.create(null); render(); };
  }

  function topGroups(){
    return Object.keys(groups).map(function(k){ return groups[k]; }).sort(function(a,b){ return b.count-a.count; }).slice(0,12);
  }

  function buildReport(){
    var out = [];
    out.push('URL: ' + location.href);
    out.push('UA: ' + navigator.userAgent);
    out.push('Viewport: ' + innerWidth + 'x' + innerHeight);
    out.push('Tempo trace: ' + Math.round((Date.now()-startedAt)/1000) + 's');
    out.push('Eventos registrados: ' + events.length);
    out.push('');
    out.push('=== TOP WRITERS / OBSERVERS ===');
    topGroups().forEach(function(g,i){
      out.push((i+1) + '. [' + g.count + 'x] ' + g.kind + ' :: ' + g.detail);
      out.push('   ' + g.frame);
      if (g.sampleStack) out.push(g.sampleStack.split('\n').map(function(x){return '      '+x;}).join('\n'));
    });
    out.push('');
    out.push('=== ÚLTIMOS EVENTOS ===');
    events.slice(-80).forEach(function(e){ out.push(e.t + ' ' + e.kind + ' target=' + e.node + ' ' + e.detail + (e.frame ? ' @ ' + e.frame : '')); });
    return out.join('\n');
  }

  function render(){
    ensurePanel();
    if (!panel) return;
    var tg = topGroups();
    summary.textContent = 'writers=' + Object.keys(groups).length + ' eventos=' + events.length;
    var lines = ['TOP CAUSAS:'];
    tg.forEach(function(g,i){ lines.push((i+1)+') '+g.count+'x '+g.kind+' — '+g.frame+' — '+g.detail); });
    lines.push('', 'ÚLTIMOS EVENTOS:');
    events.slice(-35).forEach(function(e){ lines.push(e.t+' '+e.kind+' '+e.node+' '+e.detail); });
    pre.textContent = lines.join('\n');
  }

  function scheduleRender(){
    if (timer) return;
    timer = nativeSetTimeout(function(){ timer=null; render(); }, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ render(); }, {once:true});
  else render();
})();
