// Private original-owner login and official UI readiness via Nix Chromium/CDP.
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openSync} from 'node:fs';
import {resolve} from 'node:path';
const scratch=resolve('.scratch/test-dsh'),interactive=process.argv[2]==='open',authenticated=interactive||process.argv[2]==='check-auth';
const profile=scratch+'/browser-'+Date.now();await mkdir(profile,{recursive:true,mode:0o700});
const log=openSync(scratch+'/browser.log','a',0o600);
const child=spawn('nix',['shell','nixpkgs#chromium','-c','chromium',...interactive?[]:['--headless','--disable-gpu'],'--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore',log,log]});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<240;i++){if(child.exitCode!==null)throw Error('Chromium exited; inspect private browser.log');try{const x=await fn();if(x)return x;}catch{}await pause(250);}throw Error('Browser readiness timed out');}
let ws;
try{
 const port=await until(async()=>Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]));
 const url=authenticated?(await readFile(scratch+'/launch-url','utf8')):'http://127.0.0.1:4178/';
 const page=await fetch('http://127.0.0.1:'+port+'/json/new?'+encodeURIComponent(url),{method:'PUT'}).then(r=>r.json());
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let sequence=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const evaluate=expression=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error('CDP evaluation failed')):r(m.result.result.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});
 await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && (document.body.innerText.includes('Choose workspace')||document.body.innerText.includes('Local test DSH'))"));
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Choose workspace'))?.click()");
 const ready=await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && document.body.innerText.includes('Local test DSH') && !document.body.innerText.includes('Failed to load plugins')"));
 await writeFile(scratch+'/browser-result.json',JSON.stringify({officialUIReady:ready,authenticatedOriginalUI:authenticated,carrierUI:!authenticated}),{mode:0o600});
 console.log(interactive?'Authenticated official UI is ready in isolated Chromium':'Official client UI and retained test workspace are ready');
 ws.close();ws=undefined;
 if(interactive){await new Promise(r=>child.once('exit',r));}
}finally{ws?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}}
