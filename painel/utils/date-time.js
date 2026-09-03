export const BUSINESS_TIME_ZONE = process.env.QUALITY_TIME_ZONE || 'America/Sao_Paulo';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

function clean(value=''){ return String(value ?? '').trim(); }
function pad(value){ return String(value).padStart(2,'0'); }

export function businessDateParts(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime())) return null;
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:BUSINESS_TIME_ZONE,
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
    }).formatToParts(date);
    const result=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
    return {year:result.year,month:result.month,day:result.day,hour:result.hour,minute:result.minute,second:result.second};
  }catch(_){
    return {year:String(date.getFullYear()),month:pad(date.getMonth()+1),day:pad(date.getDate()),hour:pad(date.getHours()),minute:pad(date.getMinutes()),second:pad(date.getSeconds())};
  }
}

export function businessDate(value=new Date()){
  const raw=clean(value);
  if(!raw && !(value instanceof Date)) return '';
  if(DATE_KEY_RE.test(raw)) return raw;
  if(LOCAL_DATE_TIME_RE.test(raw)) return raw.slice(0,10);
  const parts=businessDateParts(value);
  if(parts) return `${parts.year}-${parts.month}-${parts.day}`;
  return raw.slice(0,10);
}

export function businessDateTimeKey(value=new Date(),{seconds=false}={}){
  const parts=businessDateParts(value);
  if(!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}${seconds?`:${parts.second}`:''}`;
}

export function addBusinessDays(value,days=0){
  const key=businessDate(value)||businessDate();
  const [year,month,day]=key.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day+Number(days||0),12));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
}

export function addBusinessMonths(value,months=0){
  const key=businessDate(value)||businessDate();
  const [year,month,day]=key.split('-').map(Number);
  const targetMonth=(month-1)+Number(months||0);
  const targetYear=year+Math.floor(targetMonth/12);
  const normalizedMonth=((targetMonth%12)+12)%12;
  const lastDay=new Date(Date.UTC(targetYear,normalizedMonth+1,0,12)).getUTCDate();
  return `${targetYear}-${pad(normalizedMonth+1)}-${pad(Math.min(day||1,lastDay))}`;
}

export function businessMonthStart(value=new Date()){
  return `${businessDate(value).slice(0,7)}-01`;
}

export function businessMonthEnd(value=new Date()){
  const key=businessDate(value);
  const [year,month]=key.split('-').map(Number);
  const lastDay=new Date(Date.UTC(year,month,0,12)).getUTCDate();
  return `${year}-${pad(month)}-${pad(lastDay)}`;
}

function timeZoneOffsetMs(date,timeZone=BUSINESS_TIME_ZONE){
  const parts=businessDateParts(date);
  if(!parts) return 0;
  const asUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
  return asUtc-(date.getTime()-date.getMilliseconds());
}

export function businessWallTimeMs(dateKey,time='00:00:00.000'){
  const key=businessDate(dateKey);
  if(!DATE_KEY_RE.test(key)) return NaN;
  const [year,month,day]=key.split('-').map(Number);
  const match=String(time||'').match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  const hour=Number(match?.[1]||0),minute=Number(match?.[2]||0),second=Number(match?.[3]||0),millisecond=Number(String(match?.[4]||'0').padEnd(3,'0'));
  const wallUtc=Date.UTC(year,month-1,day,hour,minute,second,millisecond);
  let guess=wallUtc-timeZoneOffsetMs(new Date(wallUtc));
  const adjustedOffset=timeZoneOffsetMs(new Date(guess));
  guess=wallUtc-adjustedOffset;
  return guess;
}

export function businessDayStartMs(value=new Date()){ return businessWallTimeMs(businessDate(value),'00:00:00.000'); }
export function businessDayEndMs(value=new Date()){ return businessWallTimeMs(businessDate(value),'23:59:59.999'); }
