// Derive an owned browser runner from the existing real Host launcher.
import './dsh-startup-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
const path = '.scratch/status-live/anchor/startup-smoke.mjs'
let source = readFileSync(path, 'utf8')
source = source.replace(" const origin=ctx.webServer.getOrigin();", " const workspace=await ctx.workspaceRegistry.create(scratch, 'Issue 35 workspace');\n const fixture=ctx.sessions.create('mygo-issue35-fixture-'+Date.now(), {meta:{cwd:scratch}});\n fixture.append('turn/start',{turn:1});\n const {createUserMessage}=await import(root+'/.scratch/upstream/deepseek-harness/packages/llm/llm/lib/index.js');\n fixture.append('user/message',createUserMessage({content:[{type:'text',text:'Issue 35 read-only history fixture'}],source:{kind:'user'}}),{surfaceOp:'append'});\n ctx.sessionTitle.rename(fixture, 'Issue 35 real Host session');\n await workspace.attachSession(fixture.id);\n await writeFile(scratch+'/sessions-fixture.json',JSON.stringify({list:await ctx.sessionController.list({},new AbortController().signal),workspace:{ids:workspace.sessionIds,path:workspace.path},header:fixture.header},null,2));\n const origin=ctx.webServer.getOrigin();")
source = source.replace("return value.mode==='live' && value.text.includes('Failed to load plugins') && value;", "await writeFile(scratch+'/sessions-observation.json',JSON.stringify(value,null,2));\n   return value.mode==='live' && value.text.includes('Issue 35 read-only history fixture') && !value.text.includes('Failed to load plugins') && value;")
source = source.replace("const evidence=await until", "await pause(10000);\n const evidence=await until")
source = source.replace(" const evidence=await until", `
 const requests=[];
 const send=(method,params)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));ws.send(JSON.stringify({id,method,params}));});
 const previous=ws.onmessage;
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Network.webSocketFrameSent'){try{const f=JSON.parse(m.params.response.payloadData);requests.push({socketSent:f.type,endpoint:f.endpoint,...(f.endpoint==='session/follow'?{payload:f.payload}:{})})}catch{}}if(m.method==='Network.webSocketFrameReceived'){try{const f=JSON.parse(m.params.response.payloadData);requests.push({socketReceived:f.type,error:f.error?.code})}catch{}}if(m.method==='Network.webSocketClosed'||m.method==='Network.webSocketFrameError')requests.push({socketEvent:m.method,error:m.params.errorMessage});if(m.method==='Network.responseReceived'){const u=new URL(m.params.response.url);if(u.pathname.startsWith('/api/'))requests.push({path:u.pathname,status:m.params.response.status})}previous(event)};
 await send('Network.enable',{});
 await send('Page.reload',{});
 await pause(10000);
 // Session opening uses existing sidebar rows; no workspace-create gesture.
 await pause(1000);
 await writeFile(scratch+'/sessions-chooser.json',JSON.stringify(await evaluate("({text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(x=>({text:x.innerText,label:x.getAttribute('aria-label')}))})"),null,2));

 await pause(1000);
 await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Open sidebar')?.click()");
 await pause(1000);
 await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Issue 35 workspace')?.click()");
 await pause(1000);
 await writeFile(scratch+'/sessions-sidebar.json',JSON.stringify(await evaluate("({text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(x=>({text:x.innerText,label:x.getAttribute('aria-label')}))})"),null,2));
 await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Issue 35 real Host session')?.click()");
 await until(async()=>await evaluate("document.body.innerText.includes('Issue 35 read-only history fixture') && !document.body.innerText.includes('Loading history') && !document.body.innerText.includes('Reconnecting')"));
 await writeFile(scratch+'/sessions-open.json',JSON.stringify(await evaluate("({text:document.body.innerText,buttons:[...document.querySelectorAll('button')].map(x=>({text:x.innerText,label:x.getAttribute('aria-label')}))})"),null,2));
 const screenshot=await send('Page.captureScreenshot',{format:'png'});
 await writeFile(scratch+'/sessions-open.png',Buffer.from(screenshot.data,'base64'));
 assert.ok(requests.some(x=>x.path==='/api/session/list'&&x.status===200),'real catalog HTTP read');
 assert.ok(requests.some(x=>x.endpoint==='session/follow'),'original selected-session stream');
 await writeFile(scratch+'/sessions-network.json',JSON.stringify(requests,null,2));
 const evidence=await until`);
source = source.replaceAll("scratch+'/live-", "scratch+'/sessions-live-")
writeFileSync('.scratch/status-live/anchor/sessions-smoke.mjs',source)
