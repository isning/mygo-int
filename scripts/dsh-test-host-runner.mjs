// Copied into the private installation anchor by dsh-test-host.mjs.
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
const httpStatus=url=>new Promise((resolve,reject)=>{const req=httpRequest(url,res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});
import {runProfile} from './lib/profile-boot.js';
import {loadLayeredEnv} from '@deepseek-ai/dsh-app-boot';
import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {openSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd(), scratch=resolve('.scratch/test-dsh');
await mkdir(scratch,{recursive:true,mode:0o700});
await writeFile(scratch+'/pid',String(process.pid),{mode:0o600});
// Only this workspace's private .env and DSH_HOME .env are consulted.
const {prepareTestModel}=await import(root+'/scripts/dsh-test-model.mjs');
const model=await prepareTestModel(scratch);
const environment=loadLayeredEnv('dsh',scratch);
const clientPort=Number(process.env.DSH_CLIENT_PORT??4180);
const localClientUrl='http://127.0.0.1:'+clientPort+'/';
const clientUrl=process.env.DSH_CLIENT_PUBLIC_ORIGIN ? process.env.DSH_CLIENT_PUBLIC_ORIGIN+'/' : localClientUrl;
let boot;try{boot=await runProfile({environment,profile:'web',patchFiles:[root+'/packages/dsh-host-status/host.patch.yml',...model.patchFiles],args:['--host','127.0.0.1','--port','0','--no-open',...process.env.DSH_CLIENT_PUBLIC_ORIGIN?['--trusted-host',new URL(process.env.DSH_CLIENT_PUBLIC_ORIGIN).host]:[]]});}catch(e){await model.close();throw e;}
const {ctx,shutdown}=boot;
let carrier,stopping=false;
async function stop(code=0){if(stopping)return;stopping=true;if(carrier&&carrier.exitCode===null){carrier.kill('SIGTERM');await new Promise(r=>carrier.once('exit',r));}await shutdown.shutdown(0);await model.close();process.exit(code);}
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
try {
 const origin=ctx.webServer.getOrigin();
 const authenticatedUrl=ctx.connection.authenticatedUrl(origin+'/');
 const login=await fetch(authenticatedUrl,{redirect:'manual'});
 if(login.status!==303)throw Error('Original owner login failed');
 const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 if(!cookie)throw Error('Original owner cookie missing');
 await writeFile(scratch+'/owner-cookie',cookie,{mode:0o600});
 await writeFile(scratch+'/launch-url',authenticatedUrl,{mode:0o600});
 const workspacePath=scratch+'/workspace';await mkdir(workspacePath,{recursive:true});
 let fixtureId;
 try{fixtureId=JSON.parse(await readFile(scratch+'/session.json','utf8')).sessionId;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!fixtureId){const workspace=await ctx.workspaceRegistry.create(workspacePath,'Local test DSH');const created=await ctx.sessionController.create({workspaceId:workspace.id,sessionId:'mygo-local-test-'+Date.now()});fixtureId=created.sessionId;ctx.sessionTitle.rename(ctx.sessions.get(fixtureId),model.mode==='mock'?'Local MODEL MOCK reply':'Real provider reply');await workspace.attachSession(fixtureId);await writeFile(scratch+'/session.json',JSON.stringify({sessionId:fixtureId}),{mode:0o600});}
 // The original sidebar hides unselected blanks. Make the owned session visible
 // with a real HostAgent turn through the HTTP model mock, never journal seeding.
 if(model.mode==='mock'){
  const lease=await ctx.sessionQuery.observeSession(fixtureId,{projectionMode:'none'});
  const blank=!lease.events.some(x=>x.type==='turn/start');lease[Symbol.dispose]();
  if(blank){
   await ctx.sessionController.prompt({sessionId:fixtureId,requestId:'model-mock-warmup-'+Date.now(),interaction:'queue',content:[{type:'text',text:'Local MODEL MOCK warm-up through the original Host. Reply with a greeting.'}]},new AbortController().signal);
   let settled=false;
   for(let i=0;i<120;i++){
    const current=await ctx.sessionQuery.observeSession(fixtureId,{projectionMode:'none'});
    settled=current.events.some(x=>x.type==='assistant/message')&&current.events.some(x=>x.type==='turn/end');current[Symbol.dispose]();
    if(settled)break;await new Promise(r=>setTimeout(r,250));
   }
   assert.ok(settled,'original model-mock warm-up turn settled');
  }
 }
 // Exercise the original public in-process Peer/Fetch seams. Launch-token
 // browser admission supports owner only; this is not a new non-owner login.
 const restricted=ctx.connection.createPeer({principal:{kind:'mygo-test-restricted'},interactions:'none'});
 const shared=ctx.connection.createSharedFetchHandler('/api');
 const rpc=await shared.fetch(new Request(origin+'/api/session/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'restricted-check',method:'session/list',payload:{args:{_request:{}}}})}),restricted);
 const denied=await rpc.json();
 assert.equal(denied.error?.code??denied.result?.error?.code,'remote-access/denied','original Gateway denies a principal with no policy');
 const withdraw=ctx.connection.fetch.register({path:'/api/mygo-auth-proof',methods:['GET'],requestBody:'buffered',fetch:async()=>new Response('owner')});
 const exact=await shared.fetch(new Request(origin+'/api/mygo-auth-proof'),restricted);
 assert.equal(exact.status,403,'original Connection exact-route non-owner fence');
 await withdraw();await restricted.dispose();
 await writeFile(scratch+'/permission-validation.json',JSON.stringify({nonOwnerLoginSupported:false,inProcessRestrictedPeer:{remoteHTTP:rpc.status,remoteError:denied.error?.code??denied.result?.error?.code,exactRouteHTTP:exact.status}}),{mode:0o600});
 const log=openSync(scratch+'/carrier.log','a',0o600);
 carrier=spawn(process.execPath,[root+'/scripts/dsh-startup.mjs','serve'],{env:{...process.env,PORT:String(clientPort)},stdio:['ignore',log,log]});
 carrier.on('exit',()=>{if(!stopping)void stop();});
 let ready=false;for(let i=0;i<120;i++){try{ready=(await httpStatus(clientUrl))===200;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('Carrier did not become ready');
 const profile={id:'local-test-dsh',name:'Local test DSH',address:origin,authenticationViewId:'owner'};
 const registered=await fetch(new URL('/mygo-local/connection',clientUrl),{method:'POST',headers:{origin:new URL(clientUrl).origin,'content-type':'application/json'},body:JSON.stringify(profile)});
 if(!registered.ok)throw Error('Test instance registration failed');
 const route=(await registered.json()).url;
 const token=new URL(authenticatedUrl).searchParams.get('token');
 if(!token||!/^\/mygo-instance\/[a-f0-9]{64}\/$/.test(route))throw Error('Test instance launch construction failed');
 await writeFile(scratch+'/client-launch-url',new URL(route+'?token='+encodeURIComponent(token),clientUrl).href,{mode:0o600});
 const credential=await ctx.credentials.describe('DEEPSEEK_API_KEY');
 const status={pid:process.pid,origin,clientUrl,localClientUrl,clientBind:process.env.DSH_CLIENT_BIND??'127.0.0.1',model:{mode:model.mode,origin:model.origin,stats:model.stats},providers:ctx.llm.listProviders().map(x=>x.id),selection:ctx.agentDefaultModel.currentSelection(),credential:{reference:'DEEPSEEK_API_KEY',configured:credential.configured,source:credential.source},sessionId:fixtureId};
 if((await fetch(origin+'/mygo/status')).status!==401)throw Error('Host authentication fence failed');
 if((await fetch(origin+'/mygo/status',{headers:{cookie}})).status!==200)throw Error('Authenticated readiness failed');
 const publish=async()=>{const current=await ctx.credentials.describe('DEEPSEEK_API_KEY');status.credential={reference:'DEEPSEEK_API_KEY',configured:current.configured,source:current.source};await writeFile(scratch+'/status.next.json',JSON.stringify(status,null,2),{mode:0o600});await rename(scratch+'/status.next.json',scratch+'/status.json');};
 await publish();
 let checking=false;
 process.on('SIGUSR1',async()=>{
  if(checking||stopping)return;checking=true;
  try{
   const browser=spawn(process.execPath,[root+'/scripts/dsh-test-browser.mjs',process.env.DSH_BROWSER_CHECK==='check-remove'?'check-remove':process.env.MYGO_CLIENT_COMPOSITION==='legacy'?'check-create':'check-default'],{stdio:'inherit',env:process.env});
   assert.equal(await new Promise(r=>browser.once('exit',r)),0,'browser composer assertions');
   const browserEvidence=JSON.parse(await readFile(scratch+'/submit-browser.json','utf8'));
   const submittedSession=browserEvidence.promptCalls[0].payload.args.request.sessionId;
   const observation=await ctx.sessionQuery.observeSession(submittedSession,{projectionMode:'none'});
   let events;try{events=[...observation.events];}finally{observation[Symbol.dispose]();}
   const requestId=browserEvidence.promptCalls[0].payload.args.request.requestId;
   const user=events.filter(x=>x.type==='user/message'&&x.data?.source?.rpcId===requestId);
   const submitted=events.slice(events.indexOf(user[0])+1);
   const assistant=submitted.filter(x=>x.type==='assistant/message');
   assert.ok(model.stats.completed>0,'model HTTP mock completed a stream');
   assert.equal(user.length,1,'original durable user request identity');
   assert.equal(assistant.length,1,'one original durable assistant message for this submission');
   assert.ok(submitted.some(x=>x.type==='turn/end'),'original turn settlement');
   assert.equal(assistant[0].data.usage.totalTokens,26,'model usage preserved by original provider');
   assert.equal(assistant[0].data.stream.find(x=>x.type==='text-chunks')?.texts.length,3,'three original durable streamed deltas');
   assert.ok(assistant[0].data.stream.some(x=>x.chunk?.type==='finish'&&x.chunk.reason.kind==='stop'),'original stop framing');
   assert.ok(browserEvidence.frames.some(x=>x.includes('Hello! ')),'original socket carries assistant streaming data');
   await writeFile(scratch+'/submit-validation.json',JSON.stringify({kind:'model-mock',ok:true,modelHTTP:{origin:model.origin,...model.stats},requestId,durableUserMessages:user.length,assistantMessages:assistant.length,eventTypes:events.map(x=>x.type),assistant:assistant.map(x=>x.data),terminal:events.filter(x=>x.type==='turn/end').map(x=>x.data)},null,2));
  }catch(e){await writeFile(scratch+'/submit-validation.json',JSON.stringify({kind:'model-mock',ok:false,error:e.message}));}
  finally{checking=false;}
 });
 const refresh=setInterval(()=>{if(!stopping)publish().catch(()=>{});},5000);refresh.unref();
} catch(e){console.error('Local test Host startup failed:',String(e.message).replace(/https?:\/\/\S+/g,'[private URL]'));await stop(1);}
