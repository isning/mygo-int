// Private original-owner login and official UI readiness via Nix Chromium/CDP.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openSync} from 'node:fs';
import {resolve} from 'node:path';
const submit=process.argv[2]==='check-submit';
const scratch=resolve('.scratch/test-dsh'),interactive=process.argv[2]==='open',authenticated=interactive||process.argv[2]==='check-auth';
const profile=scratch+'/browser-'+Date.now();await mkdir(profile,{recursive:true,mode:0o700});
const log=openSync(scratch+'/browser.log','a',0o600);
const child=spawn('nix',['shell','nixpkgs#chromium','-c','chromium',...interactive?[]:['--headless','--disable-gpu'],'--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore',log,log]});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<240;i++){if(child.exitCode!==null)throw Error('Chromium exited; inspect private browser.log');try{const x=await fn();if(x)return x;}catch{}await pause(250);}throw Error('Browser readiness timed out');}
let ws,evaluate;
try{
 const port=await until(async()=>Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]));
 const url=authenticated?(await readFile(scratch+'/launch-url','utf8')):JSON.parse(await readFile(scratch+'/status.json','utf8')).clientUrl;
 const page=await fetch('http://127.0.0.1:'+port+'/json/new?'+encodeURIComponent(url),{method:'PUT'}).then(r=>r.json());
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let sequence=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const send=(method,params)=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error(m.error.message)):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const promptCalls=[],receipts=[],frames=[],responseJobs=[];
 const previous=ws.onmessage;
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=m.params;
  if(m.method==='Network.requestWillBeSent'&&new URL(p.request.url).pathname==='/api/session/prompt')promptCalls.push(JSON.parse(p.request.postData));
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname==='/api/session/prompt')receipts.push({id:p.requestId,status:p.response.status});
  if(m.method==='Network.loadingFinished'&&receipts.some(x=>x.id===p.requestId))responseJobs.push(send('Network.getResponseBody',{requestId:p.requestId}).then(x=>receipts.find(x=>x.id===p.requestId).body=JSON.parse(x.body)));
  if(m.method==='Network.webSocketFrameReceived')frames.push(p.response.payloadData);
  previous(e);
 };
 await send('Network.enable',{});
 evaluate=expression=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error('CDP evaluation failed')):r(m.result.result.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});
 await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && (document.body.innerText.includes('Choose workspace')||document.body.innerText.includes('Local test DSH'))"));
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 if(!submit)await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Choose workspace'))?.click()");
 const ready=await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && document.body.innerText.includes('Local test DSH') && !document.body.innerText.includes('Failed to load plugins')"));
 await writeFile(scratch+'/browser-result.json',JSON.stringify({officialUIReady:ready,authenticatedOriginalUI:authenticated,carrierUI:!authenticated}),{mode:0o600});
 if(submit){
  const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
  assert.equal(status.model.mode,'mock','check-submit is explicitly model mock validation');
  await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH')?.click()");
  await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
  await until(()=>evaluate("!!document.querySelector('[contenteditable=true]') && !document.body.innerText.includes('Loading history') && !document.body.innerText.includes('Reconnecting')"));
  const before=await evaluate("document.body.innerText.split('Hello! This is a deterministic local model mock reply.').length-1");
  const text='Local model MOCK composer check '+Date.now();
  await evaluate("document.querySelector('[contenteditable=true]').focus()");
  await send('Input.insertText',{text});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(async()=>receipts.length===1 && await evaluate("document.body.innerText.split('Hello! This is a deterministic local model mock reply.').length-1")>before);
  await pause(1000);await Promise.all(responseJobs);
  const ui=await evaluate("({text:document.body.innerText,editors:[...document.querySelectorAll('[contenteditable=true]')].map(x=>x.innerText)})");
  const evidence={kind:'model-mock',promptCalls,receipts,frames,ui};
  await writeFile(scratch+'/submit-browser.json',JSON.stringify(evidence,null,2));
  await writeFile(scratch+'/submit.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.equal(promptCalls.length,1);assert.equal(receipts[0]?.status,200);
  assert.equal(receipts[0]?.body?.rpcId,promptCalls[0].rpcId);
  assert.deepEqual(receipts[0]?.body?.result,{ok:true,value:{accepted:true}});
  assert.ok(ui.editors.every(x=>x===''));assert.equal(ui.text.split(text).length-1,1);
  assert.equal(ui.text.split('Hello! This is a deterministic local model mock reply.').length-1,before+1,'one new visible assistant reply');
  console.log('Original composer mock reply, receipt identity, cleared draft and no duplicate passed');
 }
 console.log(interactive?'Authenticated official UI is ready in isolated Chromium':'Official client UI and retained test workspace are ready');
 ws.close();ws=undefined;
 if(interactive){await new Promise(r=>child.once('exit',r));}
}catch(error){await writeFile(scratch+'/browser-failure.json',JSON.stringify({error:error.message,ui:evaluate?await evaluate('document.body.innerText').catch(()=>undefined):undefined},null,2));throw error;}finally{ws?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}}
