// Extend the owned list/open runner with an ordinary official-composer submission.
// Never install a mock model or append an assistant reply. An absent real provider
// is recorded as a blocker, not a successful send/reply validation.
import './dsh-sessions-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

let source = readFileSync('.scratch/status-live/anchor/sessions-smoke.mjs', 'utf8')
source = source.replaceAll('Issue 35', 'Issue 36').replaceAll('issue35', 'issue36').replaceAll('sessions-', 'submit-')
// Unlike the read-only fixture, submission needs an original persisted Agent.
source = source.replace("const fixture=ctx.sessions.create('mygo-issue36-fixture-'+Date.now(), {meta:{cwd:scratch}});", "const created=await ctx.sessionController.create({workspaceId:workspace.id,sessionId:'mygo-issue36-fixture-'+Date.now()});\n const fixture=ctx.sessions.get(created.sessionId);\n assert.ok(fixture,'original API created the owned persisted Agent');")
source = source.replace(' const requests=[];', `
 const requests=[];
 const promptCalls=[];
 const promptResponses=[];
 const responseJobs=[];
`)
source = source.replace("await send('Network.enable',{});", `
 const networkObserver=ws.onmessage;
 ws.onmessage=event=>{
   const m=JSON.parse(event.data);
   if(m.method==='Network.requestWillBeSent' && new URL(m.params.request.url).pathname==='/api/session/prompt') {
     const wire=JSON.parse(m.params.request.postData);
     promptCalls.push({rpcId:wire.rpcId,...wire.payload.args.request});
   }
   if(m.method==='Network.loadingFinished') {
     const requestId=m.params.requestId;
     if(promptResponses.some(x=>x.networkId===requestId)) responseJobs.push(send('Network.getResponseBody',{requestId}).then(x=>{
       promptResponses.find(x=>x.networkId===requestId).body=JSON.parse(x.body);
     }));
   }
   if(m.method==='Network.responseReceived' && new URL(m.params.response.url).pathname==='/api/session/prompt') promptResponses.push({networkId:m.params.requestId,status:m.params.response.status});
   networkObserver(event);
 };
 await send('Network.enable',{});
`)
source = source.replace(" const screenshot=await send('Page.captureScreenshot'", `
 await writeFile(scratch+'/submit-composer.json',JSON.stringify(await evaluate("({editors:[...document.querySelectorAll('[contenteditable],textarea')].map(x=>({tag:x.tagName,role:x.getAttribute('role'),editable:x.getAttribute('contenteditable'),placeholder:x.getAttribute('data-placeholder')||x.getAttribute('placeholder')})),text:document.body.innerText})"),null,2));
 const focused=await evaluate("(()=>{const x=document.querySelector('[contenteditable=true][role=textbox]')||document.querySelector('[contenteditable=true]');if(!x)return false;x.focus();return true})()");
 assert.ok(focused,'original composer is editable');
 await send('Input.insertText',{text:'Reply with one short greeting. This is the isolated issue 36 submission check.'});
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await until(()=>promptResponses.length>0);
 await pause(5000);
 await Promise.all(responseJobs);
 const observationLease=await ctx.sessionQuery.observeSession(fixture.id,{projectionMode:'none'});
 const events=observationLease.events;
 observationLease[Symbol.dispose]();
 const requestId=promptCalls[0]?.requestId;
 const acceptedEvents=events.filter(x=>x.type==='user/message'&&x.data?.source?.rpcId===requestId);
 const assistantEvents=events.filter(x=>x.type==='assistant/message');
 const observation={
   environment:{node:process.version,providers:ctx.llm.listProviders().map(x=>x.id),defaultSelection:ctx.agentDefaultModel.currentSelection()},
   promptCalls,promptResponses,requestId,durableUserMessages:acceptedEvents.length,
   assistantMessages:assistantEvents.length,
   terminalEvents:events.filter(x=>x.type==='turn/end').map(x=>x.data),
   ui:await evaluate("({text:document.body.innerText,editors:[...document.querySelectorAll('[contenteditable=true]')].map(x=>x.innerText)})"),
 };
 await writeFile(scratch+'/submit-result.json',JSON.stringify(observation,null,2));
 assert.equal(promptCalls.length,1,'one original prompt without carrier retries');
 assert.ok(requestId,'original request identity');
 const screenshot=await send('Page.captureScreenshot'`)
// The checkpoint is deliberately failing until a genuine assistant message exists.
// Save browser/network evidence and close owned children before returning failure.
source = source.replace(' ws.close();', `
 ws.close();
 assert.equal(promptResponses[0]?.body?.rpcId,promptCalls[0].rpcId,'original transport receipt identity');
 assert.deepEqual(promptResponses[0]?.body?.result,{ok:true,value:{accepted:true}},'real Host admission receipt');
 assert.equal(acceptedEvents.length,1,'one durable user message with original requestId');
 assert.ok(observation.ui.editors.every(text=>text===''),'original composer settled its accepted draft');
 assert.equal(observation.ui.text.split(promptCalls[0].content[0].text).length-1,1,'one visible durable prompt after settlement');
 assert.ok(assistantEvents.length>0,'BLOCKED: no actual model reply; inspect private submit-result.json');
`)
writeFileSync('.scratch/status-live/anchor/submit-smoke.mjs', source)
