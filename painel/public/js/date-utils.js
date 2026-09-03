(function(global){
  'use strict';
  const TIME_ZONE='America/Sao_Paulo';
  const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
  const LOCAL_DATE_TIME_RE=/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
  const pad=value=>String(value).padStart(2,'0');
  const clean=value=>String(value??'').trim();
  function parts(value=new Date()){
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return null;
    try{
      const raw=new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
      const map=Object.fromEntries(raw.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
      return {year:map.year,month:map.month,day:map.day,hour:map.hour,minute:map.minute,second:map.second};
    }catch(_){return {year:String(date.getFullYear()),month:pad(date.getMonth()+1),day:pad(date.getDate()),hour:pad(date.getHours()),minute:pad(date.getMinutes()),second:pad(date.getSeconds())};}
  }
  function dateKey(value=new Date()){
    const raw=clean(value);if(!raw&&!(value instanceof Date))return '';if(DATE_RE.test(raw))return raw;if(LOCAL_DATE_TIME_RE.test(raw))return raw.slice(0,10);
    const p=parts(value);return p?`${p.year}-${p.month}-${p.day}`:raw.slice(0,10);
  }
  function addDays(value,days=0){const key=dateKey(value)||dateKey();const [y,m,d]=key.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d+Number(days||0),12));return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`;}
  function addMonths(value,months=0){const key=dateKey(value)||dateKey();const [y,m,d]=key.split('-').map(Number);const target=(m-1)+Number(months||0),year=y+Math.floor(target/12),month=((target%12)+12)%12,last=new Date(Date.UTC(year,month+1,0,12)).getUTCDate();return `${year}-${pad(month+1)}-${pad(Math.min(d||1,last))}`;}
  function monthStart(value=new Date()){return `${dateKey(value).slice(0,7)}-01`;}
  function monthEnd(value=new Date()){const key=dateKey(value),[y,m]=key.split('-').map(Number),last=new Date(Date.UTC(y,m,0,12)).getUTCDate();return `${y}-${pad(m)}-${pad(last)}`;}
  function dateTimeLocal(value=new Date(),withSeconds=false){const p=parts(value);if(!p)return '';return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${withSeconds?`:${p.second}`:''}`;}
  global.QualityDate=Object.freeze({timeZone:TIME_ZONE,today:()=>dateKey(new Date()),dateKey,parts,addDays,addMonths,monthStart,monthEnd,dateTimeLocal});
})(window);
