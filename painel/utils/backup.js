import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import archiver from 'archiver';

export async function ensureDir(p){ await fsp.mkdir(p, { recursive: true }); }

export async function copyDir(src, dest){
  await ensureDir(dest);
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries){
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d);
  }
}

export async function zipDir(src, zipPath){
  await ensureDir(path.dirname(zipPath));
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  const done = new Promise((res, rej)=>{
    output.on('close', res);
    archive.on('error', rej);
  });
  archive.pipe(output);
  archive.directory(src, false);
  archive.finalize();
  await done;
}

export function timestamp(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  return d.getFullYear()+""+pad(d.getMonth()+1)+pad(d.getDate())+"-"+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
}
