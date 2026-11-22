(function(){
  const data={
    'iphone 7':{modelo:'iPhone 7', pelicula:'Película 3D iPhone 7 / 8 / SE 2020', compativeis:'iPhone 7, iPhone 8, iPhone SE 2020', nota:'Demonstração gratuita liberada com modelos antigos.'},
    'iphone 8':{modelo:'iPhone 8', pelicula:'Película 3D iPhone 7 / 8 / SE 2020', compativeis:'iPhone 7, iPhone 8, iPhone SE 2020', nota:'Demonstração gratuita liberada com modelos antigos.'},
    'iphone se 2020':{modelo:'iPhone SE 2020', pelicula:'Película 3D iPhone 7 / 8 / SE 2020', compativeis:'iPhone 7, iPhone 8, iPhone SE 2020', nota:'Demonstração gratuita liberada com modelos antigos.'},
    'samsung a10':{modelo:'Samsung A10', pelicula:'Película 3D Samsung A10', compativeis:'Samsung A10', nota:'Exemplo liberado no teste rápido para você sentir como a busca funciona.'},
    'samsung j5 pro':{modelo:'Samsung J5 Pro', pelicula:'Película 3D Samsung J5 Pro / J530', compativeis:'Samsung J5 Pro, Galaxy J530', nota:'Exemplo liberado no teste rápido para você sentir como a busca funciona.'},
    'moto g6 play':{modelo:'Moto G6 Play', pelicula:'Película 3D Moto G6 Play', compativeis:'Moto G6 Play', nota:'Modelo gratuito liberado para demonstração.'},
    'lg k10 2017':{modelo:'LG K10 2017', pelicula:'Película 3D LG K10 2017', compativeis:'LG K10 2017', nota:'Modelo gratuito liberado para demonstração.'},
    'xiaomi redmi 7a':{modelo:'Xiaomi Redmi 7A', pelicula:'Película 3D Xiaomi Redmi 7A', compativeis:'Xiaomi Redmi 7A', nota:'Modelo gratuito liberado para demonstração.'}
  };

  function normalize(v){return (v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();}

  function renderResult(target, value){
    if(!target) return;
    const key=normalize(value);
    const item=data[key];
    if(!value){
      target.innerHTML='<div class="qc-demo-placeholder"><strong>Teste liberado</strong><span>Pesquise acima para ver um exemplo gratuito com modelos mais antigos.</span></div>';
      return;
    }
    if(!item){
      target.innerHTML=''+
      '<div class="qc-result-empty">'+
      '<strong>Modelo não liberado no teste grátis</strong>'+
      '<p>No preview mostramos apenas alguns modelos antigos. Para liberar a busca completa, entre no Quality Club.</p>'+
      '<div class="qc-result-cta"><a class="qc-button" href="https://club.qualitycel.com.br/" rel="noopener">Acessar Quality Club</a></div>'+
      '</div>';
      return;
    }
    target.innerHTML=''+
    '<div class="qc-result-card">'+
      '<div class="qc-result-top"><div><strong>'+item.modelo+'</strong><div style="font-size:13px;color:#5b6473;margin-top:4px">Resultado do teste rápido</div></div><span class="qc-result-status">Disponível no preview</span></div>'+
      '<div class="qc-result-grid">'+
        '<div class="qc-result-item"><span>Modelo pesquisado</span><strong>'+item.modelo+'</strong></div>'+
        '<div class="qc-result-item"><span>Película indicada</span><strong>'+item.pelicula+'</strong></div>'+
        '<div class="qc-result-item"><span>Compatíveis</span><strong>'+item.compativeis+'</strong></div>'+
        '<div class="qc-result-item"><span>Acesso completo</span><strong>Quality Club</strong></div>'+
      '</div>'+
      '<div class="qc-result-note">'+item.nota+'</div>'+
    '</div>';
  }

  function bind(inputId, buttonId, resultId){
    const input=document.getElementById(inputId);
    const button=document.getElementById(buttonId);
    const result=document.getElementById(resultId);
    if(!input || !button || !result) return;
    const search=()=>renderResult(result, input.value);
    button.addEventListener('click', search);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); search(); } });
    input.addEventListener('change', search);
  }

  document.addEventListener('DOMContentLoaded', function(){
    bind('qc-search-input','qc-search-btn','qc-demo-result');
    bind('qc-search-input-page','qc-search-btn-page','qc-demo-result-page');
  });
})();
