import fs from 'fs';
import path from 'path';

function root(app){ return path.join(app.locals.paths.CONTENT_DIR,'erp'); }
function file(app){ return path.join(root(app),'tasks.json'); }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function readJson(fp,fallback){ try{return fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,'utf-8')):fallback;}catch{return fallback;} }
function writeJson(fp,data){ ensureDir(path.dirname(fp)); const temp=fp+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf-8'); fs.renameSync(temp,fp); }
function safe(v,max=500){ return String(v??'').replace(/[<>]/g,'').trim().slice(0,max); }
function now(){ return new Date().toISOString(); }
function makeId(){ return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function parseDue(value){ const raw=safe(value,30); if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null; const date=new Date(raw); return Number.isNaN(date.getTime())?null:date; }
function dayKey(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function classify(task,reference=new Date()){
  if(task.status==='completed') return 'completed';
  const due=parseDue(task.dueAt); if(!due) return 'upcoming';
  const today=dayKey(reference), dueDay=dayKey(due);
  if(due.getTime()<reference.getTime() && dueDay<today) return 'overdue';
  if(dueDay===today) return 'today';
  if(due.getTime()<reference.getTime()) return 'overdue';
  return 'upcoming';
}
export function ensureTaskStorage(app){ const fp=file(app); ensureDir(root(app)); if(!fs.existsSync(fp)) writeJson(fp,{version:1,tasks:[]}); return fp; }
export function listTasks(app,{customerId='',includeCompleted=true}={}){
  const fp=ensureTaskStorage(app); let tasks=(readJson(fp,{tasks:[]}).tasks||[]).filter(t=>!customerId||t.customerId===customerId);
  if(!includeCompleted) tasks=tasks.filter(t=>t.status!=='completed');
  return tasks.slice().sort((a,b)=>{ if(a.status==='completed'&&b.status!=='completed')return 1;if(b.status==='completed'&&a.status!=='completed')return -1;return String(a.dueAt||'').localeCompare(String(b.dueAt||'')); });
}
export function createTask(app,input={}){
  const title=safe(input.title,180); if(!title) throw new Error('Informe o título do lembrete.');
  const due=parseDue(input.dueAt); if(!due) throw new Error('Informe uma data e hora válidas.');
  const customerId=safe(input.customerId,100); if(!customerId) throw new Error('Cliente não identificado.');
  const priority=['low','medium','high'].includes(input.priority)?input.priority:'medium';
  const fp=ensureTaskStorage(app),data=readJson(fp,{version:1,tasks:[]});
  const task={id:makeId(),customerId,conversationId:safe(input.conversationId,100),title,description:safe(input.description,1000),dueAt:safe(input.dueAt,30),priority,status:'open',createdAt:now(),updatedAt:now(),completedAt:null};
  data.tasks.push(task); writeJson(fp,data); return task;
}
export function completeTask(app,taskId){ const fp=ensureTaskStorage(app),data=readJson(fp,{version:1,tasks:[]}); const task=data.tasks.find(t=>t.id===safe(taskId,100)); if(!task)throw new Error('Lembrete não encontrado.'); task.status='completed';task.completedAt=now();task.updatedAt=now();writeJson(fp,data);return task; }
export function deleteTask(app,taskId){ const fp=ensureTaskStorage(app),data=readJson(fp,{version:1,tasks:[]}); const before=data.tasks.length; data.tasks=data.tasks.filter(t=>t.id!==safe(taskId,100)); if(data.tasks.length===before)throw new Error('Lembrete não encontrado.');writeJson(fp,data); }
export function getTaskOverview(app){
  const tasks=listTasks(app,{includeCompleted:true}); const reference=new Date(); const open=tasks.filter(t=>t.status!=='completed').map(t=>({...t,bucket:classify(t,reference)}));
  const byConversation={}; for(const task of open){ if(!task.conversationId)continue; (byConversation[task.conversationId]??=[]).push(task); }
  for(const list of Object.values(byConversation)) list.sort((a,b)=>String(a.dueAt).localeCompare(String(b.dueAt)));
  return {today:open.filter(t=>t.bucket==='today'),overdue:open.filter(t=>t.bucket==='overdue'),upcoming:open.filter(t=>t.bucket==='upcoming'),completed:tasks.filter(t=>t.status==='completed').slice().sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt))).slice(0,20),byConversation,totalOpen:open.length};
}
