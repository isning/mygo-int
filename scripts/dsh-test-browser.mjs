// Private original-owner login and official UI readiness via Nix Chromium/CDP.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openSync} from 'node:fs';
import {resolve} from 'node:path';
const checkRemoval=process.argv[2]==='check-remove';
const checkSingleRoot=process.argv[2]==='check-single-root';
const checkManagement=process.argv[2]==='check-management';
const checkManagementRestore=process.argv[2]==='check-management-restore';
const checkManagementRecovery=process.argv[2]==='check-management-recovery';
const createSession=process.argv[2]==='check-create';
const submit=process.argv[2]==='check-submit'||checkRemoval||createSession||checkSingleRoot;
const checkLocal=process.argv[2]==='check-local'||checkRemoval;
const scratch=resolve('.scratch/test-dsh'),interactive=['open','open-management'].includes(process.argv[2]),authenticated=process.argv[2]==='check-auth';
const profileName=checkManagementRestore||checkManagementRecovery||process.argv[2]==='open-management' ? (await readFile(scratch+'/management-profile','utf8')).trim() : 'browser-'+Date.now();
assert.match(profileName,/^browser-\d+$/);
const profile=scratch+'/'+profileName;await mkdir(profile,{recursive:true,mode:0o700});
const log=openSync(scratch+'/browser.log','a',0o600);
const child=spawn('nix',['shell','nixpkgs#chromium','-c','chromium',...interactive?[]:['--headless','--disable-gpu'],'--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore',log,log]});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<240;i++){if(child.exitCode!==null)throw Error('Chromium exited; inspect private browser.log');if(stage==='local-management'&&evaluate){const failure=await evaluate("document.querySelector('[data-local-management] [role=alert]')?.textContent");if(failure?.startsWith('Local settings failed'))throw Error(failure)}try{const x=await fn();if(x)return x;}catch{}await pause(250);}throw Error('Browser readiness timed out');}
let ws,evaluate,stage='boot',initialCreates=0;
const apiResponses=[];
const browserErrors=[];
try{
 const port=await until(async()=>{
  const value=Number((await readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);
  await fetch('http://127.0.0.1:'+value+'/json/version');
  return value;
 });
 const url=await readFile(scratch+(authenticated?'/launch-url':'/client-launch-url'),'utf8');
 const page=await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let sequence=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
 const send=(method,params)=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error(m.error.message)):r(m.result));ws.send(JSON.stringify({id,method,params}));});
 const createCalls=[],catalogResponses=[],promptCalls=[],receipts=[],frames=[],responseJobs=[],socketUrls=[],lazyResponses=[],terminalChunks=[],shellResponses=[];
 const previous=ws.onmessage;
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=m.params;
  if(m.method==='Network.requestWillBeSent'&&new URL(p.request.url).pathname==='/api/session/create')createCalls.push(JSON.parse(p.request.postData));
  if(m.method==='Runtime.exceptionThrown')browserErrors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
  if(m.method==='Network.responseReceived'&&new URL(p.response.url).pathname.startsWith('/api/'))apiResponses.push({path:new URL(p.response.url).pathname,status:p.response.status});
  if(m.method==='Network.responseReceived'&&/\/api\/(settings|models|plugins|provider|config|skill|mcp)/.test(new URL(p.response.url).pathname))catalogResponses.push({path:new URL(p.response.url).pathname,status:p.response.status});
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
 await send('Runtime.enable',{});
 await send('Page.enable',{});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 if(checkLocal) await send('Page.addScriptToEvaluateOnNewDocument',{source:`{
   const originalFetch = globalThis.fetch;
   globalThis.fetch = function(input, ...args) {
     if (input === '/mygo/index-injections') {
      globalThis.__MYGO_ORIGINAL_OUTLET__ = document.getElementById('root');
      globalThis.__MYGO_LOCAL_BOOT_OBSERVATION__ = {
       markers: [...document.querySelectorAll('[data-mygo-shell]')].map(x => ({plugin:x.dataset.mygoLocalPlugin,text:x.querySelector('.mygo-shell-chrome').textContent})),
       remoteLoaderPresent: !!globalThis.__ModuleLoader__,
       remoteGraphPresent: !!globalThis.__DSH_BOOT__
      };
     }
     return originalFetch.call(this, input, ...args);
   };
 }`});
 // Verify ordinary Chromium reaches the clean origin without port exceptions,
 // and original DSH rejects this fresh, unauthenticated browser.
 const cleanOrigin=new URL(url).origin;
 await send('Page.navigate',{url:cleanOrigin+'/'});
 await until(async()=>{const state=await send('Runtime.evaluate',{expression:'location.origin === '+JSON.stringify(cleanOrigin)+' && document.readyState === "complete"',returnByValue:true});return state.result.value;});
 const anonymous=await send('Runtime.evaluate',{expression:"fetch('/').then(r=>r.status)",returnByValue:true,awaitPromise:true});
 if(!checkManagementRestore&&!checkManagementRecovery&&process.argv[2]!=='open-management'){
  assert.equal(anonymous.result.value,401,'fresh browser clean URL requires original authentication');
  await writeFile(scratch+'/browser-admission.json',JSON.stringify({origin:cleanOrigin,anonymousHTTP:401,specialPortOverride:false}),{mode:0o600});
 }
 await send('Page.navigate',{url});
 evaluate=expression=>new Promise((r,j)=>{const id=++sequence;pending.set(id,m=>m.error?j(Error('CDP evaluation failed')):r(m.result.result.value));ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
 await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && (document.body.innerText.includes('Choose workspace')||document.body.innerText.includes('Local test DSH'))"));
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 if(!submit)await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Choose workspace'))?.click()");
 const ready=await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && document.body.innerText.includes('Local test DSH') && !document.body.innerText.includes('Failed to load plugins')"));
 if(checkSingleRoot){
  stage='shared client composition';
  const contribution=await evaluate(`(() => {
   const node=document.querySelector('#root [data-mygo-shared-client]');
   return node && {text:node.textContent,local:node.dataset.localActive,session:node.dataset.sessionActive,singletons:node.dataset.platformSingletons};
  })()`);
  assert.deepEqual(contribution,{text:'MYGO supplied Context service',local:'true',session:'true',singletons:'true'},'local Loader contribution consumes the supplied Context service inside the original UI, sharing active session entries and platform modules');
  await writeFile(scratch+'/single-root-browser.json',JSON.stringify(contribution),{mode:0o600});
 }
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Continue')?.click()");
 await pause(300);
 await writeFile(scratch+'/browser-result.json',JSON.stringify({officialUIReady:ready,authenticatedOriginalUI:authenticated,carrierUI:!authenticated}),{mode:0o600});
 if(checkManagementRecovery){
  stage='local-management';
  // Simulate damaged device storage, which normal accepted UI writes cannot produce.
  await evaluate(`(() => {const key=Object.keys(localStorage).find(key=>key.startsWith('mygo.local.v1:'));const saved=JSON.parse(localStorage.getItem(key));saved.overrides['local-note'].config={label:42};localStorage.setItem(key,JSON.stringify(saved));globalThis.__MYGO_RELOAD_MARK__=true})()`);
  await send('Page.reload',{});
  await until(()=>evaluate("globalThis.__MYGO_RELOAD_MARK__!==true && __ModuleLoader__?.mode==='live' && document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · editable'"));
  await evaluate("document.querySelector('[aria-label=\"Local client settings\"]').click()");
  await until(()=>evaluate("document.body.innerText.includes('Saved startup for local-note failed; operator configuration is running instead')"));
  await evaluate("document.querySelector('[data-plugin-row=local-note] button').click()");
  await until(()=>evaluate("!!document.querySelector('textarea[aria-label=\"Local plugin configuration\"]')"));
  await evaluate(`(() => {const input=document.querySelector('textarea[aria-label="Local plugin configuration"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,JSON.stringify({label:'Local note · persisted browser edit'},null,2));input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Save and apply locally').click()");
  await until(()=>evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · persisted browser edit' && !document.querySelector('[data-plugin-runtime-error]')"));
  await writeFile(scratch+'/management-recovery-validation.json',JSON.stringify({ok:true,brokenSavedOverrideRecovered:true,operatorConfigActive:true,diagnosticVisible:true,repairSavedThroughUI:true}),{mode:0o600});
  console.log('Broken saved local override recovered to operator config, with visible diagnostic and UI repair');
 }
 if(checkManagementRestore){
  stage='local-management';
  await evaluate("document.querySelector('[aria-label=\"Local client settings\"]').click()");
  await until(()=>evaluate("!!document.querySelector('[data-plugin-row=local-note]')"));
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent"),'Local note · persisted browser edit');
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Instances').click()");
  await until(()=>evaluate("document.body.innerText.includes('Edited unavailable DSH') && document.body.innerText.includes('authenticated (DSH admission probe)')"));
  assert.equal(await evaluate("document.body.innerText.includes('Selected target is unavailable')"),false);
  await writeFile(scratch+'/management-restart-validation.json',JSON.stringify({ok:true,carrierRestart:true,deviceProfileRestored:true,configRestored:true,catalogRestored:true,realDSHAdmission:true}),{mode:0o600});
  console.log('Local composition and instance catalog restored after carrier restart in the same device profile');
 }
 if(checkManagement){
  stage='local-management';
  const click=async label=>{const clicked=await evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(label)}||x.innerText===${JSON.stringify(label)}); if(!button)return false; button.click(); return true})()`);assert.equal(clicked,true,'control '+label)};
  const fill=async(label,value)=>evaluate(`(() => { const input=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']')||[...document.querySelectorAll('label')].find(x=>x.textContent===${JSON.stringify(label)})?.control; if(!input)throw Error('missing input'); const setter=Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await click('Local client settings');
  await until(()=>evaluate("!!document.querySelector('[data-plugin-row=local-note]')"));
  const before=await evaluate('__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  assert.ok(before.some(row=>row.owner.kind==='instance'&&row.packageId==='@deepseek-ai/dsh-client-ui-session'&&row.fiberState===2));
  assert.equal(before.filter(row=>row.owner.kind==='local').length,5);
  assert.equal(await evaluate("[...document.querySelectorAll('[data-plugin-row]')].every(x=>!x.dataset.pluginRow.startsWith('@deepseek'))"),true);
  const toggle=()=>evaluate("document.querySelector('[data-plugin-row=local-note] [role=switch]').click()");
  await toggle();
  await until(()=>evaluate("!document.querySelector('[data-mygo-local-plugin=marker]') && __MYGO_ENTRY_OWNERSHIP__.snapshot().find(x=>x.entryId==='local-note').disabled"));
  await toggle();
  await until(()=>evaluate("!!document.querySelector('[data-mygo-local-plugin=marker]') && __MYGO_ENTRY_OWNERSHIP__.snapshot().find(x=>x.entryId==='local-note').fiberState===2"));
  await evaluate("document.querySelector('[data-plugin-row=local-note] button').click()");
  await until(()=>evaluate("!!document.querySelector('textarea[aria-label=\"Local plugin configuration\"]')"));
  await fill('Local plugin configuration',JSON.stringify({label:42}));
  await click('Save and apply locally');
  await until(()=>evaluate("document.body.innerText.includes('previous configuration restored') && document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · editable'"));
  await fill('Local plugin configuration',JSON.stringify({label:'Local note · persisted browser edit'},null,2));
  await click('Save and apply locally');
  await until(()=>evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · persisted browser edit'"));
  await writeFile(scratch+'/management-config.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('Instances');
  await fill('Instance id','external-example');await fill('Instance name','Example unavailable DSH');await fill('Instance address','https://example.invalid');await fill('Instance authenticationViewId','owner');
  await click('Save connection profile');
  await until(()=>evaluate("!!document.querySelector('[data-instance-id=external-example]')"));
  await click('Select Example unavailable DSH');
  await until(()=>evaluate("document.body.innerText.includes('Selected target is unavailable')"));
  await click('Edit Example unavailable DSH');await fill('Instance name','Edited unavailable DSH');await click('Save connection profile');
  await until(()=>evaluate("document.querySelector('[data-instance-id=external-example]').innerText.includes('Edited unavailable DSH')"));
  await writeFile(scratch+'/management-instances.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  const beforeReload=await evaluate('__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  assert.deepEqual(beforeReload.filter(row=>row.owner.kind==='instance'),before.filter(row=>row.owner.kind==='instance'),'local actions preserve concrete remote entries before reload');
  await evaluate('globalThis.__MYGO_RELOAD_MARK__=true');
  await send('Page.reload',{});
  await until(()=>evaluate("globalThis.__MYGO_RELOAD_MARK__!==true && __ModuleLoader__?.mode==='live' && document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · persisted browser edit'"));
  await click('Local client settings');await click('Instances');
  await until(()=>evaluate("document.body.innerText.includes('Selected target is unavailable') && document.body.innerText.includes('Edited unavailable DSH')"));
  await click('Select Local test DSH');
  await until(()=>evaluate("!document.body.innerText.includes('Selected target is unavailable')"));
  await click('LOCAL plugins');
  await writeFile(scratch+'/management.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('Close local settings');
  await until(()=>evaluate(`__MYGO_ENTRY_OWNERSHIP__.snapshot().filter(row=>row.owner.kind==='instance').length===${before.filter(row=>row.owner.kind==='instance').length}`));
  const after=await evaluate('__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  const normalize=rows=>rows.filter(row=>row.owner.kind==='instance').map(({entryId,...row})=>row).sort((a,b)=>a.packageId.localeCompare(b.packageId));
  assert.deepEqual(normalize(after),normalize(before),'reload restores original remote package states (Loader generates fresh entry ids)');
  await click('Local client settings');
  await toggle();
  await until(()=>evaluate("__MYGO_ENTRY_OWNERSHIP__.snapshot().find(x=>x.entryId==='local-note').disabled"));
  await evaluate('globalThis.__MYGO_RELOAD_MARK__=true');
  await click('Reload saved composition');
  await until(()=>evaluate("globalThis.__MYGO_RELOAD_MARK__!==true && __ModuleLoader__?.mode==='live' && !!document.querySelector('[aria-label=\"Local client settings\"]')"));
  await click('Local client settings');
  await until(()=>evaluate("!!document.querySelector('[data-plugin-row=local-note]')"));
  assert.equal(await evaluate("__MYGO_ENTRY_OWNERSHIP__.snapshot().find(x=>x.entryId==='local-note').disabled && !document.querySelector('[data-mygo-local-plugin=marker]')"),true,'disabled desired startup survives reload');
  await toggle();
  await until(()=>evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Local note · persisted browser edit'"));
  await click('Close local settings');
  assert.equal(apiResponses.some(row=>/pluginManager\/(set|enable|disable)|settings\/mutate/.test(row.path)),false,'local changes never write Host plugin settings');
  await writeFile(scratch+'/management-validation.json',JSON.stringify({ok:true,localEntries:5,disableEnable:true,failedConfigRolledBack:true,configApplied:true,reloadRestored:true,disabledReloadRestored:true,instanceAddEditSelectRestored:true,unavailableExplicit:true,remoteEntriesPreserved:true,hostManagementWrites:false}),{mode:0o600});
  await writeFile(scratch+'/management-profile',profileName,{mode:0o600});
  console.log('Original DSH local management UI: real lifecycle, config, reload and catalog checks passed');
 }
 if(checkLocal){
  const observation=await evaluate('globalThis.__MYGO_LOCAL_BOOT_OBSERVATION__');
  assert.equal(observation.markers.length,1,'selected local plugin visible before remote bootstrap request');
  assert.equal(observation.remoteLoaderPresent,false,'remote module facade has not started');
  assert.equal(observation.remoteGraphPresent,false,'remote graph has not arrived');
  const expected=process.env.MYGO_EXPECT_LOCAL_PLUGIN??'workbench';
  assert.equal(observation.markers[0].plugin,expected,'configuration selected actual plugin module');
  const current=await evaluate("[...document.querySelectorAll('[data-mygo-shell]')].map(x=>({plugin:x.dataset.mygoLocalPlugin,text:x.querySelector('.mygo-shell-chrome').textContent}))");
  assert.deepEqual(current,observation.markers,'local plugin survives original remote activation');
  assert.deepEqual(lazyResponses,[],'original ModuleSystem replaces the scoped lazy bootstrap capability');
  const ownership=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
  const localEntries=ownership.filter(row=>row.owner.kind==='local');
  const remoteEntries=ownership.filter(row=>row.owner.kind==='instance');
  assert.equal(localEntries.length,expected==='workbench'?5:1,'concrete local Loader entries');
  assert.equal(localEntries.find(row=>row.entryId==='local-shell').packageId,'./plugins/'+expected+'.js');
  assert.ok(localEntries.every(row=>row.fiberState===2),'local entries are actually active');
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
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH'&&x.getAttribute('aria-expanded')==='false')?.click()");
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
  stage='dismiss notice';
  const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
  assert.equal(status.model.mode,'mock','check-submit is explicitly model mock validation');
  if(!checkRemoval&&!createSession){
  await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH'&&x.getAttribute('aria-expanded')==='false')?.click()");
  await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
  }
  if(createSession){
   await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
   await until(()=>evaluate("[...document.querySelectorAll('button')].some(x=>x.getAttribute('aria-label')==='New session in Local test DSH')"));
   await pause(500);
   initialCreates=createCalls.length;
   await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='New session in Local test DSH')?.click()");
   await pause(300);
  }
  await until(()=>evaluate("!!document.querySelector('[contenteditable=true]') && !document.body.innerText.includes('Loading history') && !document.body.innerText.includes('Reconnecting')"));
  // The fixture already has a warm-up turn; wait for its history before counting replies.
  if(!createSession)await until(()=>evaluate("document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"));
  const replyCount="[...document.querySelectorAll('[data-chat-flow-kind=assistant-step]')].filter(x=>x.innerText.includes('Hello! This is a deterministic local model mock reply.')).length";
  const before=await evaluate(replyCount);
  const text='Local model MOCK composer check '+Date.now();
  await evaluate("document.querySelector('[contenteditable=true]').focus()");
  stage='insert prompt';
  await send('Input.insertText',{text});
  await until(()=>evaluate("document.querySelector('[contenteditable=true]')?.innerText.includes("+JSON.stringify(text)+")"));
  stage='submit prompt';
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(async()=>receipts.length===1 && await evaluate(replyCount)>before);
  await pause(1000);await Promise.all(responseJobs);
  const visibleReplies=await evaluate(replyCount);
  const ui=await evaluate("({text:document.body.innerText,editors:[...document.querySelectorAll('[contenteditable=true]')].map(x=>x.innerText)})");
  const browserOrigin=await evaluate('location.origin');
  assert.equal(browserOrigin,new URL(status.clientUrl).origin);
  const ownsHost=await evaluate('globalThis.__DSH_TRANSPORT__?.ownsHost === true');
  assert.equal(ownsHost,false,'presentation does not own upstream Host');
  assert.ok(socketUrls.some(value=>new URL(value).host===new URL(status.clientUrl).host),'socket uses presentation authority');
  await writeFile(scratch+'/submit.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  if(createSession){
   assert.equal(createCalls.length-initialCreates,1,'one new session/create request from the original New session control');
   const ownership=await evaluate('globalThis.__MYGO_ENTRY_OWNERSHIP__.snapshot()');
   assert.equal(ownership.filter(x=>x.owner.kind==='local').length,process.env.MYGO_EXPECT_LOCAL_PLUGIN==='focus'?1:5,'local Loader entries remain owned locally');
   assert.ok(ownership.some(x=>x.packageId==='@deepseek-ai/dsh-client-ui-session'&&x.fiberState===2),'original Session client entry remains active');
   assert.ok(ownership.filter(x=>x.owner.kind==='instance').every(x=>x.owner.instanceId==='local-test-dsh'&&x.owner.authenticationViewId==='owner'),'remote entries retain selected instance/authentication view');
   await writeFile(scratch+'/ownership-validation.json',JSON.stringify(ownership,null,2),{mode:0o600});
   stage='settings and catalog';
   await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Account menu')?.click()");
   await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText.includes('Settings'))"));
   await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText.includes('Settings'))?.click()");
   await until(()=>evaluate("!!document.querySelector('[data-shortcut-modal=settings]')"));
   await until(()=>catalogResponses.some(x=>x.path.startsWith('/api/settings/')&&x.status===200));
   await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(x=>x.innerText==='Models')?.click()");
   await pause(500);
   await writeFile(scratch+'/settings.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   assert.ok(apiResponses.some(x=>x.path==='/api/session/modelCatalog'&&x.status===200),'original model catalog read succeeds');
   assert.ok(apiResponses.some(x=>x.path==='/api/dynamicCordisRunner/inventory'&&x.status===200),'original plugin inventory read succeeds');
   assert.ok(apiResponses.filter(x=>x.path==='/api/session/create').every(x=>x.status===200),'original session creation requests succeed');
   assert.ok(catalogResponses.length>0);
   assert.ok(catalogResponses.every(x=>x.status===200),'normal settings/catalog reads admitted by DSH');
  }
  const evidence={initialCreates,createCalls,catalogResponses,apiResponses,visibleReplies,kind:'model-mock',browserOrigin,ownsHost,socketUrls,promptCalls,receipts,frames,ui};
  await writeFile(scratch+'/submit-browser.json',JSON.stringify(evidence,null,2));
  assert.equal(promptCalls.length,1);assert.equal(receipts[0]?.status,200);
  assert.equal(receipts[0]?.body?.rpcId,promptCalls[0].rpcId);
  assert.deepEqual(receipts[0]?.body?.result,{ok:true,value:{accepted:true}});
  assert.ok(ui.editors.every(x=>x===''));assert.equal(ui.text.split(text).length-1,1);
  assert.equal(visibleReplies,before+1,'one new visible assistant reply');
  console.log('Original composer mock reply, receipt identity, cleared draft and no duplicate passed');
 }
 console.log(interactive?'Authenticated official UI is ready in isolated Chromium':'Official client UI and retained test workspace are ready');
 if(!interactive){
  // Flush renderer-backed device storage before the owned browser exits.
  // SIGTERM remains only the failure/timeout fallback in finally.
  await send('Page.navigate',{url:'about:blank'});
  await pause(250);
  await Promise.race([send('Browser.close',{}),pause(5000)]);
  if(child.exitCode===null)await Promise.race([new Promise(r=>child.once('exit',r)),pause(5000)]);
 }
 ws.close();ws=undefined;
 if(interactive){await new Promise(r=>child.once('exit',r));}
}catch(error){await writeFile(scratch+'/browser-failure.json',JSON.stringify({error:error.message,stage,apiResponses,browserErrors,ui:evaluate?await evaluate('document.body.innerText').catch(()=>undefined):undefined},null,2));throw error;}finally{ws?.close();if(child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}}
