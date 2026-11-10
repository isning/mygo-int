// Reuse the existing isolated Host install anchor; generate an owned boot smoke.
import './dsh-status-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const anchor = resolve('.scratch/status-live/anchor')
const existing = readFileSync(`${anchor}/smoke.mjs`, 'utf8')
const prefix = existing.slice(0, existing.indexOf('try {'))
writeFileSync(`${anchor}/startup-smoke.mjs`, prefix + `
const {spawn}=await import('node:child_process');
const {mkdir,readFile,writeFile}=await import('node:fs/promises');
const root=${JSON.stringify(process.cwd())};
const scratch=root+'/.scratch/dsh-startup';
await mkdir(scratch,{recursive:true});
const children=[];
const browserProfile=scratch+'/live-browser-'+Date.now();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<120;i++){try{const value=await fn();if(value)return value;}catch{}await pause(250);}throw Error('Timed out waiting for local smoke');};
try {
 const origin=ctx.webServer.getOrigin();
 const login=await fetch(ctx.connection.authenticatedUrl(origin+'/'),{redirect:'manual'});
 assert.equal(login.status,303);
 const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 assert.ok(cookie);
 const cookieFile=scratch+'/owner-cookie';
 await writeFile(cookieFile,cookie,{mode:0o600});
 const log=await import('node:fs').then(m=>m.openSync(scratch+'/carrier.log','w',0o600));
 const carrier=spawn(process.execPath,[root+'/scripts/dsh-startup.mjs','serve'],{cwd:root,env:{...process.env,PORT:'4178',DSH_ORIGIN:origin,DSH_COOKIE_FILE:cookieFile},stdio:['ignore',log,log]});children.push(carrier);
 await until(async()=>{const r=await fetch('http://127.0.0.1:4178/');return r.ok});
 const browser=spawn('nix',['shell','nixpkgs#chromium','-c','chromium','--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+browserProfile,'about:blank'],{cwd:root,env:{...process.env,XDG_CACHE_HOME:root+'/.scratch/browser-cache'},stdio:['ignore',log,log]});children.push(browser);
 const port=await until(async()=>Number((await readFile(browserProfile+'/DevToolsActivePort','utf8')).split('\\n')[0]));
 const page=await fetch('http://127.0.0.1:'+port+'/json/new?http://127.0.0.1:4178/',{method:'PUT'}).then(r=>r.json());
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let sequence=0;const pending=new Map();
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}};
 const evaluate=expression=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result.result.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}))});
 const evidence=await until(async()=>{
   const value=await evaluate('({mode:globalThis.__ModuleLoader__?.mode,entries:globalThis.__DSH_BOOT__?.entries?.length,graphRev:globalThis.__DSH_BOOT__?.rev,text:document.body.innerText,scripts:[...document.scripts].map(x=>x.src).filter(Boolean)})');
   return value.mode==='live' && value.text.includes('Failed to load plugins') && value;
 });
 assert.ok(evidence.entries>0,'real graph is present');
 assert.equal(evidence.entries,ctx.clientModules.graph().entries.length);
 assert.equal(evidence.graphRev,ctx.clientModules.graph().rev);
 assert.equal(await evaluate('globalThis.__DSH_BOOT_READY__.promise.then(()=>true)'),true);
 assert.ok(!evidence.text.includes('bootstrap facade is missing'),'original module initialization passed bootstrap');
 await writeFile(scratch+'/live-result.json',JSON.stringify({login:303,...evidence},null,2)+'\\n');
 await writeFile(scratch+'/live-dom.html',await evaluate('document.documentElement.outerHTML'));
 ws.close();
} finally {
 for(const child of children.reverse()) {if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),pause(5000)]);}}
 await shutdown.shutdown(0);
}
process.exit(0);
`)
