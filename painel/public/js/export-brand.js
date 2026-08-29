(()=>{
  const cfg=window.QUALITY_EXPORT_BRAND||{};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const versionedLogo=()=>{
    const raw=String(cfg.logoUrl||'').trim();
    if(!raw) return '';
    const join=raw.includes('?')?'&':'?';
    return raw+join+'v='+encodeURIComponent(cfg.logoVersion||1);
  };
  const companyName=()=>String(cfg.name||'Quality ERP').trim()||'Quality ERP';
  const css=()=>`.quality-export-brand{display:flex;align-items:center;gap:12px;min-width:0}.quality-export-brand img{width:112px;max-height:54px;object-fit:contain;object-position:left center}.quality-export-brand-copy{display:grid;gap:2px}.quality-export-brand-copy strong{font-size:20px;color:#111}.quality-export-brand-copy b{font-size:15px;color:#111}.quality-export-brand-copy small{font-size:10px;color:#666}@media print{.quality-export-brand img{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
  const headerHtml=({title='',subtitle='Quality ERP',logoSrc=''}={})=>{
    const logo=logoSrc||versionedLogo();
    return `<div class="quality-export-brand">${logo?`<img src="${esc(logo)}" alt="${esc(companyName())}">`:''}<div class="quality-export-brand-copy"><strong>${esc(companyName())}</strong>${title?`<b>${esc(title)}</b>`:''}${subtitle?`<small>${esc(subtitle)}</small>`:''}</div></div>`;
  };
  const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=reject;reader.readAsDataURL(blob);});
  const getLogoDataUrl=async()=>{
    const logo=versionedLogo();
    if(!logo) return '';
    try{
      const response=await fetch(logo,{credentials:'same-origin',cache:'force-cache'});
      if(!response.ok) throw new Error('logo');
      return await blobToDataUrl(await response.blob());
    }catch(_){ return ''; }
  };
  const loadLogoImage=async()=>{
    const source=await getLogoDataUrl();
    if(!source) return null;
    return await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=source;});
  };
  const downloadCanvas=(canvas,fileName)=>new Promise(resolve=>{
    canvas.toBlob(blob=>{
      if(!blob){resolve(false);return;}
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download=fileName||'relatorio.png';anchor.style.display='none';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1800);resolve(true);
    },'image/png');
  });
  window.QualityExportBrand={config:cfg,esc,companyName,versionedLogo,css,headerHtml,getLogoDataUrl,loadLogoImage,downloadCanvas};
})();
