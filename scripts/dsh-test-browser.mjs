// Private original-owner login and official UI readiness via Nix Chromium/CDP.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openSync} from 'node:fs';
import {resolve} from 'node:path';
const checkRemoval=process.argv[2]==='check-remove';
const submit=process.argv[2]==='check-submit'||checkRemoval;
const checkLocal=process.argv[2]==='check-local'||checkRemoval;
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
 const page=await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let sequence=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const send=(method,params)=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error(m.error.message)):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const promptCalls=[],receipts=[],frames=[],responseJobs=[],socketUrls=[],lazyResponses=[],terminalChunks=[],shellResponses=[];
 const previous=ws.onmessage;
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=m.params;
  if(m.method==='Network.requestWillBeSent'&&new URL(p.request.url).pathname==='/api/session/prompt')promptCalls.push(JSON.parse(p.request.postData));
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname==='/api/session/prompt')receipts.push({id:p.requestId,status:p.response.status});
  if(m.method==='Network.loadingFinished'&&receipts.some(x=>x.id===p.requestId))responseJobs.push(send('Network.getResponseBody',{requestId:p.requestId}).then(x=>receipts.find(x=>x.id===p.requestId).body=JSON.parse(x.body)));
  if(m.method==='Network.webSocketCreated')socketUrls.push(p.url);
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname==='/mygo-boot/lazy-resources.js')lazyResponses.push(p.response.status);
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname==='/plugins/@deepseek-ai/dsh-client-ui-sidebar-terminal/client.terminal.js')terminalChunks.push(p.response.status);
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname==='/api/terminal/shells')shellResponses.push(p.response.status);
  if(m.method==='Network.webSocketFrameReceived')frames.push(p.response.payloadData);
  previous(e);
 };
 await send('Network.enable',{});
 await send('Page.enable',{});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 if(checkLocal) await send('Page.addScriptToEvaluateOnNewDocument',{source:`{
   const originalFetch = globalThis.fetch;
   globalThis.fetch = function(input, ...args) {
     if (input === '/mygo/index-injections') {
      globalThis.__MYGO_ORIGINAL_OUTLET__ = document.getElementById('root');
      globalThis.__MYGO_LOCAL_BOOT_OBSERVATION__ = {
       markers: [...document.querySelectorAll('[data-mygo-local-plugin]')].map(x => ({plugin:x.dataset.mygoLocalPlugin,text:x.querySelector('.mygo-shell-chrome').textContent})),
       remoteLoaderPresent: !!globalThis.__ModuleLoader__,
       remoteGraphPresent: !!globalThis.__DSH_BOOT__
      };
     }
     return originalFetch.call(this, input, ...args);
   };
 }`});
 await send('Page.navigate',{url});
 evaluate=expression=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error('CDP evaluation failed')):r(m.result.result.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
 await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && (document.body.innerText.includes('Choose workspace')||document.body.innerText.includes('Local test DSH'))"));
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 if(!submit)await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Choose workspace'))?.click()");
 const ready=await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && document.body.innerText.includes('Local test DSH') && !document.body.innerText.includes('Failed to load plugins')"));
 await writeFile(scratch+'/browser-result.json',JSON.stringify({officialUIReady:ready,authenticatedOriginalUI:authenticated,carrierUI:!authenticated}),{mode:0o600});
 if(checkLocal){
  const observation=await evaluate('globalThis.__MYGO_LOCAL_BOOT_OBSERVATION__');
  assert.equal(observation.markers.length,1,'selected local plugin visible before remote bootstrap request');
  assert.equal(observation.remoteLoaderPresent,false,'remote module facade has not started');
  assert.equal(observation.remoteGraphPresent,false,'remote graph has not arrived');
  const expected=process.env.MYGO_EXPECT_LOCAL_PLUGIN??'workbench';
  assert.equal(observation.markers[0].plugin,expected,'configuration selected actual plugin module');
  const current=await evaluate("[...document.querySelectorAll('[data-mygo-local-plugin]')].map(x=>({plugin:x.dataset.mygoLocalPlugin,text:x.querySelector('.mygo-shell-chrome').textContent}))");
  assert.deepEqual(current,observation.markers,'local plugin survives original remote activation');
  assert.deepEqual(lazyResponses,[200],'combined startup serves the lazy resource boot module');
  const ownership=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  const localEntries=ownership.filter(row=>row.owner.kind==='local');
  const remoteEntries=ownership.filter(row=>row.owner.kind==='instance');
  assert.equal(localEntries.length,1,'concrete local Loader entry');
  assert.equal(localEntries[0].packageId,'./plugins/'+expected+'.js');
  assert.equal(localEntries[0].fiberState,2,'local entry is actually active');
  assert.ok(remoteEntries.length>0,'original ClientEntries created remote entries');
  assert.ok(remoteEntries.some(row=>row.packageId==='@deepseek-ai/dsh-client-ui-session'&&row.fiberState===2),'original session entry is active');
  assert.ok(remoteEntries.every(row=>row.owner.instanceId==='local-test-dsh'&&row.owner.authenticationViewId==='owner'),'selected local identity owns actual remote graph');
  const graphIds=await evaluate('globalThis.__DSH_BOOT__.entries.map(row=>row.id).sort()');
  assert.deepEqual(remoteEntries.map(row=>row.packageId).sort(),graphIds,'original package IDs and complete graph roster preserved');
  const layout=await evaluate(`(() => {
    const shell=document.querySelector('[data-mygo-shell]');
    const outlet=shell.querySelector('[data-ui-owner="connected-instance"]');
    const root=document.getElementById('root');
    const chrome=shell.querySelector('.mygo-shell-chrome').getBoundingClientRect();
    const bounds=outlet.getBoundingClientRect();
    return {owner:shell.dataset.contributionOwner,sameRoot:root===globalThis.__MYGO_ORIGINAL_OUTLET__,nested:outlet.contains(root),chrome:{x:chrome.x,y:chrome.y,width:chrome.width,height:chrome.height},outlet:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}};
  })()`);
  assert.equal(layout.owner,'trusted-local');
  assert.equal(layout.sameRoot,true);assert.equal(layout.nested,true);
  assert.ok(layout.outlet.width>300&&layout.outlet.height>300,'usable instance outlet');
  if(expected==='workbench')assert.ok(layout.outlet.x>=layout.chrome.width,'rail occupies separate layout space');
  else assert.ok(layout.outlet.y>=layout.chrome.height,'header occupies separate layout space');
  await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH')?.click()");
  await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
  await until(()=>evaluate("!!document.querySelector('#root [contenteditable=true]') && document.body.innerText.includes('Hello! This is a deterministic local model mock reply.') && !document.body.innerText.includes('Failed to load history') && !document.body.innerText.includes('Reconnecting')"));
  await writeFile(scratch+'/local-'+expected+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await until(()=>evaluate("!!document.querySelector('[data-sidebar-right-expand]')"));
  await evaluate("document.querySelector('[data-sidebar-right-expand]').click()");
  await until(()=>evaluate("!!document.querySelector('[data-sidebar-right-guide-entry=terminal] button')"));
  if(checkRemoval){
   await evaluate("document.querySelector('[data-sidebar-right-guide-entry=terminal] button[aria-haspopup=menu]').click()");
   await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem]')].some(el=>el.innerText.includes('bash') && el.getBoundingClientRect().width>0)"));
   assert.deepEqual(shellResponses,[200],'one successful original shell discovery');
   await writeFile(scratch+'/remove-before.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  }
  await evaluate("document.querySelector('[data-sidebar-right-guide-entry=terminal] button').click()");
  await until(()=>evaluate("(()=>{const el=document.querySelector('[data-sidebar-terminal]');return !!el&&el.getBoundingClientRect().width>0})()"));
  assert.deepEqual(terminalChunks,[200],'original Terminal chunk loads with both local shell routes enabled');
  if(checkRemoval){
   // Preserve concrete DOM identities for observation only; disposal never edits DOM here.
   await evaluate("globalThis.__MYGO_SHELL_BEFORE__=document.querySelector('[data-mygo-shell]')");
   const before=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
   const result=await evaluate("globalThis.__MYGO_REMOTE_CONTRIBUTION_CASE__.removeTerminal().then(value=>({value}),error=>({error:String(error)}))");
   assert.ok(!result.error,result.error);
   await until(()=>evaluate("!document.querySelector('[data-sidebar-terminal]') && !document.querySelector('[data-sidebar-right-guide-entry=terminal]')"));
   const after=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
   assert.deepEqual(after,before.filter(row=>row.packageId!=='@deepseek-ai/dsh-client-ui-sidebar-terminal'),'exactly one remote contribution removed; all other entry identities/states retained');
   const repeated=await evaluate("globalThis.__MYGO_REMOTE_CONTRIBUTION_CASE__.removeTerminal().then(value=>({value}),error=>({error:String(error)}))");
   assert.ok(!repeated.error,repeated.error);
   assert.deepEqual(repeated,result,'original graph reconciliation is idempotent');
   assert.deepEqual(await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()'),after);
   assert.equal(await evaluate("document.querySelector('[data-mygo-shell]')===globalThis.__MYGO_SHELL_BEFORE__ && document.getElementById('root')===globalThis.__MYGO_ORIGINAL_OUTLET__ && !!document.querySelector('#root [contenteditable=true]') && document.body.innerText.includes('Hello! This is a deterministic local model mock reply.') && !document.body.innerText.includes('Failed to load history')"),true,'same local shell, original outlet and unrelated session remain usable');
   await writeFile(scratch+'/remove.json',JSON.stringify({before,after,result,repeated,terminalChunks,shellResponses,layout},null,2));
   await writeFile(scratch+'/remove.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   console.log('Original used Terminal contribution removed twice; same local shell/outlet and unrelated session retained');
  } else {
  await evaluate("dispatchEvent(new PageTransitionEvent('pagehide'))");
  await until(()=>evaluate("document.querySelectorAll('[data-mygo-local-plugin]').length===0"));
  assert.equal(await evaluate("document.getElementById('root')===globalThis.__MYGO_ORIGINAL_OUTLET__ && !!document.querySelector('#root [contenteditable=true]')"),true,'local disposal retains mounted original session UI');
  const afterDisposal=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  assert.equal(afterDisposal.filter(row=>row.owner.kind==='local').length,0,'disposed local scope releases registry membership');
  assert.deepEqual(afterDisposal,remoteEntries,'local lifecycle leaves remote entries and owners intact');
  await writeFile(scratch+'/local-'+expected+'.json',JSON.stringify({officialUIReady:ready,...observation,layout,ownership,afterDisposal,lazyResponses,terminalChunks,sessionOpened:true,disposed:true},null,2));
  }
  console.log('Configured shell, original outlet, session and lazy boot passed');
 }
 if(submit){
  const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
  assert.equal(status.model.mode,'mock','check-submit is explicitly model mock validation');
  if(!checkRemoval){
  await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH')?.click()");
  await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
  }
  await until(()=>evaluate("!!document.querySelector('[contenteditable=true]') && !document.body.innerText.includes('Loading history') && !document.body.innerText.includes('Reconnecting')"));
  // The fixture already has a warm-up turn; wait for its history before counting replies.
  await until(()=>evaluate("document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"));
  const before=await evaluate("document.body.innerText.split('Hello! This is a deterministic local model mock reply.').length-1");
  const text='Local model MOCK composer check '+Date.now();
  await evaluate("document.querySelector('[contenteditable=true]').focus()");
  await send('Input.insertText',{text});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(async()=>receipts.length===1 && await evaluate("document.body.innerText.split('Hello! This is a deterministic local model mock reply.').length-1")>before);
  await pause(1000);await Promise.all(responseJobs);
  const ui=await evaluate("({text:document.body.innerText,editors:[...document.querySelectorAll('[contenteditable=true]')].map(x=>x.innerText)})");
  const browserOrigin=await evaluate('location.origin');
  assert.equal(browserOrigin,new URL(status.clientUrl).origin);
  const ownsHost=await evaluate('globalThis.__DSH_TRANSPORT__?.ownsHost === true');
  assert.equal(ownsHost,false,'presentation does not own upstream Host');
  assert.ok(socketUrls.some(value=>new URL(value).host===new URL(status.clientUrl).host),'socket uses presentation authority');
  const evidence={kind:'model-mock',browserOrigin,ownsHost,socketUrls,promptCalls,receipts,frames,ui};
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
