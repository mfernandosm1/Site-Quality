import express from 'express';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { copyDir, zipDir, timestamp, ensureDir } from '../utils/backup.js';
import exportForGHPages from '../utils/export.js';
import { spawn } from 'child_process';

const router = express.Router();
function P(app){ return app.locals.paths; }
const BACKUP_ROOT = (app)=> path.join(P(app).BACKUPS_DIR, 'snapshots');

async function detectRepo(app){
  let cur = P(app).ROOT_DIR;
  for (let i=0;i<5;i++){
    if (fs.existsSync(path.join(cur, '.git'))) return cur;
    cur = path.dirname(cur);
  }
  return null;
}

router.get('/', async (req,res)=>{
  try { await ensureDir(BACKUP_ROOT(req.app)); } catch(e){}
  let backups = [];
  try { backups = (await fsp.readdir(BACKUP_ROOT(req.app))).sort().reverse(); } catch(e){}
  const repo = await detectRepo(req.app);
  res.render('publicar', { repo, backups, flash: null, query: req.query });
});

router.post('/backup', async (req,res)=>{
  try{
    const ts = timestamp();
    const dest = path.join(BACKUP_ROOT(req.app), 'site-'+ts);
    await ensureDir(BACKUP_ROOT(req.app));
    console.log('[publish] creating backup at', dest);
    await copyDir(P(req.app).SITE_DIR, dest);
    res.redirect('/publicar?ok=backup&backup=' + encodeURIComponent('site-'+ts));
  }catch(e){
    console.error('[publish] backup error', e);
    res.redirect('/publicar?err=backup');
  }
});

router.post('/export-zip', async (req,res)=>{
  try{
    const ts = timestamp();
    const bdir = path.join(BACKUP_ROOT(req.app), 'site-'+ts);
    await ensureDir(BACKUP_ROOT(req.app));
    console.log('[publish] auto-backup at', bdir);
    await copyDir(P(req.app).SITE_DIR, bdir);

    const out = path.join(P(req.app).TMP_DIR, 'dist-'+ts);
    await exportForGHPages(P(req.app).SITE_DIR, out);
    const zip = path.join(P(req.app).TMP_DIR, 'dist-'+ts+'.zip');
    await zipDir(out, zip);
    res.download(zip);
  }catch(e){
    console.error('[publish] export error', e);
    res.status(500).send('Export error: '+e.message);
  }
});

router.post('/publish-git', async (req,res)=>{
  const repo = await detectRepo(req.app);
  if (!repo) return res.status(400).send('Repo não detectado.');
  try{
    const ts = timestamp();
    const bdir = path.join(BACKUP_ROOT(req.app), 'site-'+ts);
    await ensureDir(BACKUP_ROOT(req.app));
    console.log('[publish] auto-backup at', bdir);
    await copyDir(P(req.app).SITE_DIR, bdir);

    const out = path.join(P(req.app).TMP_DIR, 'dist-'+ts);
    await exportForGHPages(P(req.app).SITE_DIR, out);

    const files = await fsp.readdir(out);
    for (const f of files){
      await fsp.cp(path.join(out, f), path.join(repo, f), { recursive: true, force: true });
    }
    const run = (cmd, args, cwd)=> new Promise((res, rej)=>{
      const p = spawn(cmd, args, { cwd, shell: true });
      let log=''; p.stdout.on('data', d=> log+=d); p.stderr.on('data', d=> log+=d);
      p.on('close', code=> code===0?res(log):rej(new Error(log+' (code '+code+')')));
    });
    await run('git', ['add','-A'], repo);
    await run('git', ['commit','-m', `Publish: painel export ${ts}`], repo).catch(()=>{});
    await run('git', ['push','origin','main'], repo);

    res.redirect('/publicar?ok=git&backup='+encodeURIComponent('site-'+ts));
  }catch(e){
    console.error('[publish] publish-git error', e);
    res.status(500).send('Publish error: '+e.message);
  }
});

export default router;
