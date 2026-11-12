// Private original-owner login and official UI readiness via Nix Chromium/CDP.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {connectChromium,launchChromium} from './chromium-cdp.mjs';
const checkInstance=process.argv[2]==='check-instance';
const checkSingleManagement=['check-single-management','check-management'].includes(process.argv[2]);
const checkDefault=process.argv[2]==='check-default';
const checkSingleRoot=process.argv[2]==='check-single-root'||checkDefault||checkInstance;
const createSession=process.argv[2]==='check-create'||checkDefault||checkInstance;
const submit=process.argv[2]==='check-submit'||createSession||checkSingleRoot;
const scratch=resolve('.scratch/test-dsh'),interactive=['open','open-management'].includes(process.argv[2]),authenticated=process.argv[2]==='check-auth';
const profileName='browser-'+Date.now();
assert.match(profileName,/^browser-\d+$/);
const {browser:child,profile}=await launchChromium({scratch,profileName,logName:'browser.log',interactive});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<240;i++){if(child.exitCode!==null)throw Error('Chromium exited; inspect private browser.log');if(stage==='local-management'&&evaluate){const failure=await evaluate("document.querySelector('[data-local-management] [role=alert]')?.textContent");if(failure?.startsWith('Local settings failed'))throw Error(failure)}try{const x=await fn();if(x)return x;}catch{}await pause(250);}throw Error('Browser readiness timed out');}
let ws,evaluate,stage='boot',initialCreates=0;
const apiResponses=[];
const apiRequests=[];
const browserErrors=[];
try{
 const url=await readFile(scratch+(authenticated?'/launch-url':'/client-launch-url'),'utf8');
 const cdp=await connectChromium({profile,until});
 ws=cdp.socket;const {send}=cdp;evaluate=cdp.evaluate;
 const createCalls=[],catalogResponses=[],promptCalls=[],receipts=[],frames=[],responseJobs=[],socketUrls=[],terminalChunks=[],shellResponses=[];
 const pathOf=url=>new URL(url).pathname.replace(/^\/mygo-instance\/[a-f0-9]{64}/,'');
 cdp.onMessage(m=>{const p=m.params;
  if(m.method==='Network.requestWillBeSent'&&pathOf(p.request.url)==='/api/session/create')createCalls.push(JSON.parse(p.request.postData));
  if(m.method==='Network.requestWillBeSent'&&pathOf(p.request.url).startsWith('/api/'))apiRequests.push(pathOf(p.request.url));
  if(m.method==='Runtime.exceptionThrown')browserErrors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
  if(m.method==='Network.responseReceived'&&pathOf(p.response.url).startsWith('/api/'))apiResponses.push({path:pathOf(p.response.url),status:p.response.status});
  if(m.method==='Network.responseReceived'&&/\/api\/(settings|models|plugins|provider|config|skill|mcp)/.test(pathOf(p.response.url)))catalogResponses.push({path:pathOf(p.response.url),status:p.response.status});
  if(m.method==='Network.requestWillBeSent'&&pathOf(p.request.url)==='/api/session/prompt')promptCalls.push(JSON.parse(p.request.postData));
  if(m.method==='Network.responseReceived'&&pathOf(p.response.url)==='/api/session/prompt')receipts.push({id:p.requestId,status:p.response.status});
  if(m.method==='Network.loadingFinished'&&receipts.some(x=>x.id===p.requestId))responseJobs.push(send('Network.getResponseBody',{requestId:p.requestId}).then(x=>receipts.find(x=>x.id===p.requestId).body=JSON.parse(x.body)));
  if(m.method==='Network.webSocketCreated')socketUrls.push(p.url);
  if(m.method==='Network.responseReceived'&&pathOf(p.response.url)==='/plugins/@deepseek-ai/dsh-client-ui-sidebar-terminal/client.terminal.js')terminalChunks.push(p.response.status);
  if(m.method==='Network.responseReceived'&&pathOf(p.response.url)==='/api/terminal/shells')shellResponses.push(p.response.status);
  if(m.method==='Network.webSocketFrameReceived')frames.push(p.response.payloadData);
 });
 await send('Network.enable',{});
 await send('Runtime.enable',{});
 await send('Page.enable',{});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 if(checkDefault) await send('Page.addScriptToEvaluateOnNewDocument',{source:`{
  const roots = new Set(), renderers = new Map();
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {supportsFiber:true, renderers,
    inject(renderer) { const id=renderers.size+1; renderers.set(id,renderer); return id },
    onCommitFiberRoot(id,root) { if(root.current.memoizedState?.element) roots.add(root); else roots.delete(root) },
    onCommitFiberUnmount() {},
  };
  globalThis.__MYGO_BROWSER_ROOTS__ = roots;
}`});
 // Verify ordinary Chromium reaches the clean origin without port exceptions,
 // and original DSH rejects this fresh, unauthenticated browser.
 const cleanOrigin=new URL(url).origin;
 await send('Page.navigate',{url:cleanOrigin+'/'});
 await until(async()=>{const state=await send('Runtime.evaluate',{expression:'location.origin === '+JSON.stringify(cleanOrigin)+' && document.readyState === "complete"',returnByValue:true});return state.result.value;});
 const anonymous=await send('Runtime.evaluate',{expression:"fetch('/mygo/status').then(r=>r.status)",returnByValue:true,awaitPromise:true});
 if(process.argv[2]!=='open-management'){
  assert.equal(anonymous.result.value,410,'the clean mygo origin has no implicit remote status route');
  await writeFile(scratch+'/browser-admission.json',JSON.stringify({origin:cleanOrigin,unscopedRemoteHTTP:410,specialPortOverride:false}),{mode:0o600});
 }
 await send('Page.navigate',{url});
 try {
  await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && (document.body.innerText.includes('Choose workspace')||document.body.innerText.includes('Local test DSH'))"));
 } catch (error) {
  await writeFile(scratch+'/browser-readiness.json',JSON.stringify(await evaluate("({text:document.body.innerText,loader:globalThis.__ModuleLoader__?.mode,url:location.pathname})")),{mode:0o600});
  throw error;
 }
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 if(!submit)await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Choose workspace'))?.click()");
 const ready=await until(async()=>await evaluate("globalThis.__ModuleLoader__?.mode==='live' && document.body.innerText.includes('Local test DSH') && !document.body.innerText.includes('Failed to load plugins')"));
 if(checkSingleRoot){
  stage='shared client composition';
  if(checkDefault){
   assert.equal(await evaluate("document.querySelectorAll('[data-mygo-shell], [data-local-management], [aria-label=\"Local client settings\"]').length"),0,'default has no outer shell or floating management application');
   assert.equal(await evaluate('__MYGO_BROWSER_ROOTS__.size'),1,'one mounted original React root');
   assert.equal(await evaluate('__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size'),1,'one original React renderer');
  }
  const startup=await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json())");
  assert.ok(startup.entries.length>0 && startup.entries.every(entry=>entry.name.startsWith('./plugins/')),'the active document exposes the curated local composition');
  await writeFile(scratch+'/single-root-browser.json',JSON.stringify({localEntries:startup.entries.map(entry=>entry.name),...checkDefault?{reactRoots:await evaluate('__MYGO_BROWSER_ROOTS__.size'),reactRenderers:await evaluate('__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size')}: {}}),{mode:0o600});
 }
 if(checkSingleManagement){
  stage='shared local management';
  const {checkSharedManagement}=await import('./dsh-single-management-browser.mjs');
  const management=await checkSharedManagement({evaluate,until,apiRequests});
  await writeFile(scratch+'/single-management-browser.json',JSON.stringify(management),{mode:0o600});
 }
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Continue')?.click()");
 await pause(300);
 await writeFile(scratch+'/browser-result.json',JSON.stringify({officialUIReady:ready,authenticatedOriginalUI:authenticated,carrierUI:!authenticated}),{mode:0o600});
 if(submit){
  stage='dismiss notice';
  const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
  assert.equal(status.model.mode,'mock','check-submit is explicitly model mock validation');
  if(!createSession){
  await until(()=>evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH'&&x.getAttribute('aria-expanded')==='false')?.click()");
  await until(()=>evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"));
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply')?.click()");
  }
  if(createSession){
   await until(()=>evaluate("[...document.querySelectorAll('button')].some(x=>{const label=x.getAttribute('aria-label')||'';return label.includes('Local test DSH')&&/New session|新建会话/.test(label)})"));
   await pause(500);
   initialCreates=createCalls.length;
   await evaluate("[...document.querySelectorAll('button')].find(x=>{const label=x.getAttribute('aria-label')||'';return label.includes('Local test DSH')&&/New session|新建会话/.test(label)})?.click()");
   await pause(300);
  }
  await until(()=>evaluate("!!document.querySelector('[contenteditable=true]') && !document.body.innerText.includes('Loading history') && !document.body.innerText.includes('Reconnecting')"));
  // The fixture already has a warm-up turn; wait for its history before counting replies.
  if(!createSession)await until(()=>evaluate("document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"));
  const replyCount=`[...document.querySelectorAll('[data-chat-group-part="response"]')].filter(node => node.innerText.includes('Hello! This is a deterministic local model mock reply.')).length`;
  const before=await evaluate(replyCount);
  const text='Local model MOCK composer check '+Date.now();
  await evaluate("document.querySelector('[contenteditable=true]').focus()");
  stage='insert prompt';
  await send('Input.insertText',{text});
  await until(()=>evaluate("document.querySelector('[contenteditable=true]')?.innerText.includes("+JSON.stringify(text)+")"));
  stage='submit prompt';
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(async()=>await evaluate(replyCount)>before);
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
   const startup=await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json())");
   assert.ok(startup.selectedInstance,'the connected document retains its explicit instance identity');
   await writeFile(scratch+'/ownership-validation.json',JSON.stringify({selectedInstance:startup.selectedInstance,localEntries:startup.entries.map(entry=>entry.name)},null,2),{mode:0o600});
   if(!checkInstance){
   stage='settings and catalog';
   await evaluate("[...document.querySelectorAll('button')].find(x=>['Account menu','账号菜单'].includes(x.getAttribute('aria-label')))?.click()");
   await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>/Settings|设置/.test(x.innerText))"));
   await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>/Settings|设置/.test(x.innerText))?.click()");
   await until(()=>evaluate("!!document.querySelector('[data-shortcut-modal=settings]')"));
   await until(()=>catalogResponses.some(x=>x.path.startsWith('/api/settings/')&&x.status===200));
   await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(x=>/^(Models|模型)$/.test(x.innerText))?.click()");
   await pause(500);
   await writeFile(scratch+'/settings.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   assert.ok(apiResponses.some(x=>x.path==='/api/session/modelCatalog'&&x.status===200),'original model catalog read succeeds');
   assert.ok(apiResponses.some(x=>x.path==='/api/dynamicCordisRunner/inventory'&&x.status===200),'original plugin inventory read succeeds');
   assert.ok(apiResponses.filter(x=>x.path==='/api/session/create').every(x=>x.status===200),'original session creation requests succeed');
   assert.ok(catalogResponses.length>0);
   assert.ok(catalogResponses.every(x=>x.status===200),'normal settings/catalog reads admitted by DSH');
   }
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
