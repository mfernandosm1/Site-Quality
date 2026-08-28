import fs from 'fs';
import path from 'path';

const OWNER_PALETTE=['#4b83ff','#9b6cff','#20a46b','#e19b24','#df5b66','#2aa7b8'];
const DEFAULT_TYPES=[
  {id:'task',name:'Tarefa',dueMode:'required',builtin:true},
  {id:'reminder',name:'Lembrete',dueMode:'optional',builtin:true},
  {id:'call',name:'Ligação',dueMode:'required',builtin:true},
  {id:'followup',name:'Retorno',dueMode:'required',builtin:true},
  {id:'appointment',name:'Compromisso',dueMode:'required',builtin:true}
];

function root(app){ return path.join(app.locals.paths.CONTENT_DIR,'erp'); }
function file(app){ return path.join(root(app),'tasks.json'); }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function readJson(fp,fallback){ try{return fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,'utf-8')):fallback;}catch{return fallback;} }
function writeJson(fp,data){ ensureDir(path.dirname(fp)); const temp=fp+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf-8'); fs.renameSync(temp,fp); }
function safe(v,max=500){ return String(v??'').replace(/[<>]/g,'').trim().slice(0,max); }
function now(){ return new Date().toISOString(); }
function makeId(prefix='task'){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function taskSnapshot(task={}){ return {title:task.title||'',description:task.description||'',dueAt:task.dueAt||'',priority:task.priority||'medium',type:task.type||'task',typeName:task.typeName||'',customerId:task.customerId||'',customerName:task.customerName||'',owner:task.owner||'',status:task.status||'open'}; }
function taskHistory(task,entry){ task.history=Array.isArray(task.history)?task.history:[]; task.history.unshift(entry); task.history=task.history.slice(0,100); }
function parseDue(value){
  const raw=safe(value,30);
  const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if(!match) return null;
  const [,ys,ms,ds,hs,mins]=match;
  const year=Number(ys),month=Number(ms),day=Number(ds),hour=Number(hs),minute=Number(mins);
  if(year<2000||year>2100||month<1||month>12||day<1||day>31||hour<0||hour>23||minute<0||minute>59) return null;
  const date=new Date(year,month-1,day,hour,minute,0,0);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date.getHours()!==hour||date.getMinutes()!==minute) return null;
  return date;
}
function validDate(value){ const date=value instanceof Date?value:new Date(value); return Number.isNaN(date.getTime())?null:date; }
function dayKey(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function normalizeColor(value){ const color=safe(value,20); return /^#[0-9a-fA-F]{6}$/.test(color)?color:'#4b83ff'; }
function normalizeDueMode(value){ return value==='optional'?'optional':'required'; }
function defaultTypes(){ return DEFAULT_TYPES.map(item=>({...item,createdAt:''})); }
function classify(task,reference=new Date()){
  if(task.status==='completed') return 'completed';
  const due=parseDue(task.dueAt);
  if(!due) return 'undated';
  const today=dayKey(reference), dueDay=dayKey(due);
  if(due.getTime()<reference.getTime()) return 'overdue';
  if(dueDay===today) return 'today';
  return 'upcoming';
}
function normalizeTypes(types=[]){
  const normalized=(Array.isArray(types)?types:[]).map(item=>({
    id:safe(item?.id,100)||makeId('type'),
    name:safe(item?.name,80),
    dueMode:normalizeDueMode(item?.dueMode),
    builtin:Boolean(item?.builtin),
    createdAt:item?.createdAt||now()
  })).filter(item=>item.name);
  const byId=new Map(normalized.map(item=>[item.id,item]));
  for(const item of defaultTypes()){
    if(!byId.has(item.id)) normalized.unshift(item);
    else {
      const current=byId.get(item.id);
      current.builtin=true;
      if(!current.name) current.name=item.name;
      if(item.id==='reminder') current.dueMode='optional';
    }
  }
  const seen=new Set();
  return normalized.filter(item=>{ if(seen.has(item.id)) return false; seen.add(item.id); return true; });
}
function normalizeStorage(data={}){
  const tasks=Array.isArray(data.tasks)?data.tasks:[];
  let owners=Array.isArray(data.owners)?data.owners:[];
  if(!owners.length){
    owners=[...new Set(tasks.map(t=>safe(t.owner,160)).filter(Boolean))].map((name,index)=>({id:makeId('owner'),name,color:OWNER_PALETTE[index%OWNER_PALETTE.length],active:true,createdAt:now()}));
  }
  owners=owners.map((owner,index)=>({id:safe(owner.id,100)||makeId('owner'),name:safe(owner.name,160),color:normalizeColor(owner.color||OWNER_PALETTE[index%OWNER_PALETTE.length]),active:owner.active!==false,createdAt:owner.createdAt||now()})).filter(o=>o.name);
  const types=normalizeTypes(data.types);
  return {version:4,tasks,owners,types};
}
function readStorage(app){
  const fp=ensureTaskStorage(app);
  return {fp,data:normalizeStorage(readJson(fp,{version:4,tasks:[],owners:[],types:defaultTypes()}))};
}

export function ensureTaskStorage(app){
  const fp=file(app); ensureDir(root(app));
  if(!fs.existsSync(fp)) { writeJson(fp,{version:4,tasks:[],owners:[],types:defaultTypes()}); return fp; }
  const current=readJson(fp,{version:1,tasks:[]});
  // Mantém a limpeza histórica da v2 e migra sem apagar tarefas das versões posteriores.
  if(Number(current.version||1)<2){ writeJson(fp,{version:4,tasks:[],owners:[],types:defaultTypes()}); return fp; }
  if(Number(current.version||1)<4 || !Array.isArray(current.owners) || !Array.isArray(current.types)) writeJson(fp,normalizeStorage(current));
  return fp;
}

export function listAgendaOwners(app,{includeInactive=false}={}){
  const {data}=readStorage(app);
  return data.owners.filter(owner=>includeInactive||owner.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export function listTaskOwners(app){ return listAgendaOwners(app).map(owner=>owner.name); }
export function createAgendaOwner(app,input={}){
  const name=safe(input.name,160); if(!name) throw new Error('Informe o nome do responsável.');
  const {fp,data}=readStorage(app);
  if(data.owners.some(owner=>owner.name.localeCompare(name,'pt-BR',{sensitivity:'accent'})===0)) throw new Error('Este responsável já está cadastrado.');
  const owner={id:makeId('owner'),name,color:normalizeColor(input.color),active:true,createdAt:now()};
  data.owners.push(owner); writeJson(fp,data); return owner;
}
export function deleteAgendaOwner(app,ownerId){
  const {fp,data}=readStorage(app);
  const index=data.owners.findIndex(owner=>owner.id===safe(ownerId,100)); if(index<0) throw new Error('Responsável não encontrado.');
  const [owner]=data.owners.splice(index,1); writeJson(fp,data); return owner;
}

export function listAgendaTypes(app){
  const {data}=readStorage(app);
  return data.types.slice().sort((a,b)=>{
    const ai=DEFAULT_TYPES.findIndex(item=>item.id===a.id), bi=DEFAULT_TYPES.findIndex(item=>item.id===b.id);
    if(ai>=0||bi>=0){ if(ai<0)return 1;if(bi<0)return -1;return ai-bi; }
    return a.name.localeCompare(b.name,'pt-BR');
  });
}
export function createAgendaType(app,input={}){
  const name=safe(input.name,80); if(!name) throw new Error('Informe o nome do tipo.');
  const {fp,data}=readStorage(app);
  if(data.types.some(item=>item.name.localeCompare(name,'pt-BR',{sensitivity:'accent'})===0)) throw new Error('Este tipo já está cadastrado.');
  const type={id:makeId('type'),name,dueMode:normalizeDueMode(input.dueMode),builtin:false,createdAt:now()};
  data.types.push(type); writeJson(fp,data); return type;
}
export function deleteAgendaType(app,typeId){
  const id=safe(typeId,100); const {fp,data}=readStorage(app);
  const index=data.types.findIndex(item=>item.id===id); if(index<0) throw new Error('Tipo não encontrado.');
  if(data.types[index].builtin) throw new Error('Os tipos padrão da agenda não podem ser removidos.');
  if(data.tasks.some(task=>task.type===id&&task.status!=='completed'&&task.status!=='cancelled')) throw new Error('Este tipo ainda está sendo usado em itens pendentes da agenda.');
  const [type]=data.types.splice(index,1); writeJson(fp,data); return type;
}

export function listTasks(app,{customerId='',owner='',includeCompleted=true}={}){
  const {data}=readStorage(app); let tasks=(data.tasks||[]).filter(t=>(!customerId||t.customerId===customerId)&&(!owner||t.owner===owner));
  if(!includeCompleted) tasks=tasks.filter(t=>t.status!=='completed'&&t.status!=='cancelled');
  return tasks.slice().sort((a,b)=>{ if(a.status==='completed'&&b.status!=='completed')return 1;if(b.status==='completed'&&a.status!=='completed')return -1;if(!a.dueAt&&b.dueAt)return 1;if(a.dueAt&&!b.dueAt)return -1;return String(a.dueAt||'').localeCompare(String(b.dueAt||'')); });
}
export function getTask(app,taskId){ const {data}=readStorage(app); const task=data.tasks.find(t=>t.id===safe(taskId,100)); return task?JSON.parse(JSON.stringify(task)):null; }
export function createTask(app,input={},actor='painel'){
  const title=safe(input.title,12000); if(!title) throw new Error('Informe o que precisa ser feito.');
  const {fp,data}=readStorage(app);
  const requestedType=safe(input.type,100)||'task';
  const type=data.types.find(item=>item.id===requestedType) || data.types.find(item=>item.id==='task') || DEFAULT_TYPES[0];
  const dueRaw=safe(input.dueAt,30); const due=dueRaw?parseDue(dueRaw):null;
  if(type.dueMode==='required' && !due) throw new Error('Informe uma data e hora válidas.');
  if(type.dueMode==='optional' && dueRaw && !due) throw new Error('Informe uma data e hora válidas ou deixe a data em branco.');
  const customerId=safe(input.customerId,100);
  const priority=['low','medium','high'].includes(input.priority)?input.priority:'medium';
  const createdAt=now(),createdBy=safe(actor,160)||'painel';
  const task={id:makeId(),customerId,customerName:safe(input.customerName,180),conversationId:safe(input.conversationId,100),owner:safe(input.owner,160)||createdBy,type:type.id,typeName:type.name,title,description:safe(input.description,12000),dueAt:dueRaw,priority,status:'open',createdAt,createdBy,updatedAt:createdAt,updatedBy:createdBy,completedAt:null,history:[]};
  taskHistory(task,{at:createdAt,actor:createdBy,action:'created',before:null,after:taskSnapshot(task)});
  data.tasks.push(task); writeJson(fp,data); return JSON.parse(JSON.stringify(task));
}
export function updateTask(app,taskId,input={},actor='painel'){
  const {fp,data}=readStorage(app); const task=data.tasks.find(t=>t.id===safe(taskId,100)); if(!task)throw new Error('Item não encontrado.');
  const before=taskSnapshot(task),title=safe(input.title,12000); if(!title)throw new Error('Informe o que precisa ser feito.');
  const requestedType=safe(input.type,100)||task.type||'task'; const type=data.types.find(item=>item.id===requestedType)||data.types.find(item=>item.id==='task')||DEFAULT_TYPES[0];
  const dueRaw=safe(input.dueAt,30); const due=dueRaw?parseDue(dueRaw):null; if(type.dueMode==='required'&&!due)throw new Error('Informe uma data e hora válidas.'); if(type.dueMode==='optional'&&dueRaw&&!due)throw new Error('Informe uma data e hora válidas ou deixe a data em branco.');
  task.title=title;task.description=safe(input.description,12000);task.dueAt=dueRaw;task.priority=['low','medium','high'].includes(input.priority)?input.priority:'medium';task.type=type.id;task.typeName=type.name;task.customerId=safe(input.customerId,100);task.customerName=safe(input.customerName,180);task.owner=safe(input.owner,160)||task.owner||'painel';
  task.updatedAt=now();task.updatedBy=safe(actor,160)||'painel'; const after=taskSnapshot(task); taskHistory(task,{at:task.updatedAt,actor:task.updatedBy,action:'updated',before,after}); writeJson(fp,data); return {task:JSON.parse(JSON.stringify(task)),before,after};
}
export function completeTask(app,taskId,actor='painel'){ const {fp,data}=readStorage(app); const task=data.tasks.find(t=>t.id===safe(taskId,100)); if(!task)throw new Error('Item não encontrado.'); const before=taskSnapshot(task); task.status='completed';task.completedAt=now();task.updatedAt=task.completedAt;task.updatedBy=safe(actor,160)||'painel';taskHistory(task,{at:task.updatedAt,actor:task.updatedBy,action:'completed',before,after:taskSnapshot(task)});writeJson(fp,data);return JSON.parse(JSON.stringify(task)); }
export function deleteTask(app,taskId){ const {fp,data}=readStorage(app); const index=data.tasks.findIndex(t=>t.id===safe(taskId,100)); if(index<0)throw new Error('Item não encontrado.'); const [task]=data.tasks.splice(index,1);writeJson(fp,data);return JSON.parse(JSON.stringify(task)); }

export function getTaskOverview(app,{owner=''}={}){
  const tasks=listTasks(app,{owner,includeCompleted:true}); const reference=new Date();
  const typeMap=new Map(listAgendaTypes(app).map(item=>[item.id,item]));
  const enrich=task=>({...task,typeName:safe(task.typeName,80)||typeMap.get(task.type)?.name||'Tarefa'});
  const open=tasks.filter(t=>t.status!=='completed'&&t.status!=='cancelled').map(t=>({...enrich(t),bucket:classify(t,reference)}));
  const byConversation={}; for(const task of open){ if(!task.conversationId)continue; (byConversation[task.conversationId]??=[]).push(task); }
  for(const list of Object.values(byConversation)) list.sort((a,b)=>String(a.dueAt||'').localeCompare(String(b.dueAt||'')));
  const undated=open.filter(t=>t.bucket==='undated');
  return {
    today:open.filter(t=>t.bucket==='today'),
    overdue:open.filter(t=>t.bucket==='overdue'),
    upcoming:open.filter(t=>t.bucket==='upcoming'),
    undated,
    reminders:undated,
    completed:tasks.filter(t=>t.status==='completed').map(enrich).slice().sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt))).slice(0,40),
    byConversation,
    totalOpen:open.length
  };
}

function average(values=[]){ return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0; }
function oldestUsefulDate(owner,tasks){
  const values=[owner?.createdAt,...tasks.map(task=>task.createdAt),...tasks.map(task=>task.dueAt),...tasks.map(task=>task.completedAt)]
    .map(validDate).filter(Boolean).sort((a,b)=>a-b);
  return values[0]||null;
}
export function getAgendaAnalytics(app,{minCompleted=6,minHistoryDays=14}={}){
  const owners=listAgendaOwners(app,{includeInactive:true});
  const tasks=listTasks(app,{includeCompleted:true});
  const reference=new Date();
  const DAY=24*60*60*1000;
  const result=[];
  for(const owner of owners){
    const completed=tasks.filter(task=>task.owner===owner.name&&task.status==='completed'&&parseDue(task.dueAt)&&validDate(task.completedAt));
    const historyStart=oldestUsefulDate(owner,completed);
    const historyDays=historyStart?Math.floor((reference-historyStart)/DAY):0;
    if(completed.length<minCompleted||historyDays<minHistoryDays) continue;
    const offsets=completed.map(task=>(validDate(task.completedAt).getTime()-parseDue(task.dueAt).getTime())/60000);
    const tolerance=15;
    const late=offsets.filter(value=>value>tolerance);
    const early=offsets.filter(value=>value<-tolerance).map(value=>Math.abs(value));
    const onTime=offsets.filter(value=>value<=tolerance).length;
    const onTimeRate=Math.round((onTime/offsets.length)*100);
    const avgDelayMinutes=Math.round(average(late));
    const avgEarlyMinutes=Math.round(average(early));
    let insight=''; let tone='neutral';
    if(onTimeRate>=85){
      tone='good';
      insight=`Boa regularidade: ${onTimeRate}% dos compromissos avaliados foram concluídos no prazo.`;
    }else if(onTimeRate<70 && late.length>=2){
      tone='attention';
      insight=`Há recorrência de atraso: ${onTimeRate}% foram concluídos no prazo${avgDelayMinutes?` e os atrasados passaram em média ${avgDelayMinutes} min do horário`:''}. Vale revisar carga e prazos antes de assumir novos compromissos.`;
    }else{
      insight=`Regularidade intermediária: ${onTimeRate}% dos compromissos avaliados foram concluídos no prazo. Acompanhar os próximos registros ajuda a identificar um padrão mais firme.`;
    }
    result.push({owner:owner.name,color:owner.color,completedCount:completed.length,onTimeRate,lateCount:late.length,earlyCount:early.length,avgDelayMinutes,avgEarlyMinutes,historyDays,insight,tone});
  }
  return result.sort((a,b)=>a.owner.localeCompare(b.owner,'pt-BR'));
}
