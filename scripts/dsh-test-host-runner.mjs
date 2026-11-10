// Copied into the private installation anchor by dsh-test-host.mjs.
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
const environment=loadLayeredEnv('dsh',scratch);
const {ctx,shutdown}=await runProfile({environment,profile:'web',patchFiles:[root+'/packages/dsh-host-status/host.patch.yml'],args:['--host','127.0.0.1','--port','0','--no-open']});
let carrier,stopping=false;
async function stop(){if(stopping)return;stopping=true;if(carrier&&carrier.exitCode===null){carrier.kill('SIGTERM');await new Promise(r=>carrier.once('exit',r));}await shutdown.shutdown(0);process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
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
 if(!fixtureId){const workspace=await ctx.workspaceRegistry.create(workspacePath,'Local test DSH');const created=await ctx.sessionController.create({workspaceId:workspace.id,sessionId:'mygo-local-test-'+Date.now()});fixtureId=created.sessionId;ctx.sessionTitle.rename(ctx.sessions.get(fixtureId),'Issue 36 real reply');await workspace.attachSession(fixtureId);await writeFile(scratch+'/session.json',JSON.stringify({sessionId:fixtureId}),{mode:0o600});}
 const log=openSync(scratch+'/carrier.log','a',0o600);
 carrier=spawn(process.execPath,[root+'/scripts/dsh-startup.mjs','serve'],{env:{...process.env,PORT:'4178',DSH_ORIGIN:origin,DSH_COOKIE_FILE:scratch+'/owner-cookie'},stdio:['ignore',log,log]});
 carrier.on('exit',()=>{if(!stopping)void stop();});
 let ready=false;for(let i=0;i<120;i++){try{ready=(await fetch('http://127.0.0.1:4178/')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('Carrier did not become ready');
 const credential=await ctx.credentials.describe('DEEPSEEK_API_KEY');
 const status={pid:process.pid,origin,clientUrl:'http://127.0.0.1:4178/',providers:ctx.llm.listProviders().map(x=>x.id),selection:ctx.agentDefaultModel.currentSelection(),credential:{reference:'DEEPSEEK_API_KEY',configured:credential.configured,source:credential.source},sessionId:fixtureId};
 if((await fetch(origin+'/mygo/status')).status!==401)throw Error('Host authentication fence failed');
 if((await fetch(origin+'/mygo/status',{headers:{cookie}})).status!==200)throw Error('Authenticated readiness failed');
 const publish=async()=>{const current=await ctx.credentials.describe('DEEPSEEK_API_KEY');status.credential={reference:'DEEPSEEK_API_KEY',configured:current.configured,source:current.source};await writeFile(scratch+'/status.next.json',JSON.stringify(status,null,2),{mode:0o600});await rename(scratch+'/status.next.json',scratch+'/status.json');};
 await publish();
 const refresh=setInterval(()=>{if(!stopping)publish().catch(()=>{});},5000);refresh.unref();
} catch(e){console.error('Local test Host startup failed:',e.code??e.name);await stop();}
