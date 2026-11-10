#!/usr/bin/env node
import {createCarrierTrust} from './dsh-carrier-trust.mjs';
// Persistent owned local Host controller; never prints credentials or launch URLs.
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import net from 'node:net';
import {request as httpRequest} from 'node:http';
const httpStatus=url=>new Promise((resolve,reject)=>{const req=httpRequest(url,res=>{res.resume();resolve({status:res.statusCode})});req.on('error',reject);req.end()});
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);process.umask(0o077);
const scratch=resolve('.scratch/test-dsh'),anchor=resolve('.scratch/status-live/anchor');
await mkdir(scratch,{recursive:true,mode:0o700});
// Same isolation as the shell helper, also for dlx launched below.
for(const [key,value] of Object.entries({XDG_CACHE_HOME:'.cache',XDG_DATA_HOME:'.data',XDG_STATE_HOME:'.state',PNPM_HOME:'.pnpm',npm_config_cache:'.npm-cache',npm_config_store_dir:'.pnpm-store'}))process.env[key]=resolve('.scratch/upstream',value);
Object.assign(process.env,{NARB_NATIVE_CACHE_DIR:scratch+'/native-cache',DSH_HOME:scratch+'/home',DSH_AGENTS_HOME:scratch+'/agents',DSH_TELEMETRY_DISABLED:'1'});
async function owned(){try{const pid=Number(await readFile(scratch+'/pid','utf8'));if(!Number.isInteger(pid)||pid<2)return null;const cmd=await readFile(`/proc/${pid}/cmdline`,'utf8');return cmd.split('\0').includes(anchor+'/test-host.mjs')?pid:null;}catch{return null;}}
const command=process.argv[2];
if(command==='start'){
 if(await owned())throw Error('Owned Host already running; use status');
 const clientPort=Number(process.env.DSH_CLIENT_PORT??4180);
 if(!Number.isInteger(clientPort)||clientPort<1024||clientPort>65535)throw Error('Invalid DSH_CLIENT_PORT');
 const publicOrigin=process.env.DSH_CLIENT_PUBLIC_ORIGIN;
 createCarrierTrust({publicOrigins:publicOrigin?[publicOrigin]:[]});
 if((process.env.DSH_CLIENT_BIND??'127.0.0.1')!=='127.0.0.1'&&!publicOrigin)throw Error('Non-loopback bind requires DSH_CLIENT_PUBLIC_ORIGIN');
 if(publicOrigin&&Number(new URL(publicOrigin).port|| (new URL(publicOrigin).protocol==='https:'?443:80))!==clientPort)throw Error('Public origin port must match DSH_CLIENT_PORT');
 const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(clientPort,process.env.DSH_CLIENT_BIND??'127.0.0.1',r);});await new Promise(r=>probe.close(r));
 const p=spawnSync(process.execPath,['scripts/dsh-status-live-prepare.mjs'],{stdio:'inherit'});if(p.status!==0)process.exit(1);
 await copyFile('scripts/dsh-test-host-runner.mjs',anchor+'/test-host.mjs');
 // Clear stale readiness by replacing it with a safe starting marker.
 await writeFile(scratch+'/status.json',JSON.stringify({starting:true}));
 const log=openSync(scratch+'/runtime.log','a',0o600);
 const child=spawn('pnpm',['--config.auto-install-peers=false','dlx','--package=node-linux-x64@24.21.0','node',anchor+'/test-host.mjs'],{cwd:root,env:process.env,detached:true,stdio:['ignore',log,log]});child.unref();closeSync(log);
 for(let i=0;i<480;i++){await new Promise(r=>setTimeout(r,250));if(child.exitCode!==null)throw Error('Owned runner exited; inspect private runtime.log');const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));if(!status.starting&&await owned()){console.log(JSON.stringify(status,null,2));process.exit(0);}}
 throw Error('Startup not ready after 120 seconds; inspect private runtime.log');
}else if(command==='check-submit'){
 const pid=await owned();if(!pid)throw Error('Start the Host first');
 await writeFile(scratch+'/submit-validation.json',JSON.stringify({pending:true}));
 process.kill(pid,'SIGUSR1');
 for(let i=0;i<480;i++){await new Promise(r=>setTimeout(r,250));const result=JSON.parse(await readFile(scratch+'/submit-validation.json','utf8'));if(!result.pending){console.log(JSON.stringify(result,null,2));process.exit(result.ok?0:1);}}
 throw Error('Composer validation still pending; inspect private runtime.log');
}else if(command==='status'){
 if(!await owned())throw Error('Owned Host is stopped');
 const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
 const [host,client]=await Promise.all([fetch(status.origin+'/mygo/status'),httpStatus(status.clientUrl)]);
 const mockHealth=status.model?.mode==='mock'?await fetch(status.model.origin+'/health').then(r=>r.json()):undefined;
 console.log(JSON.stringify({...status,unauthenticatedHostStatus:host.status,clientStatus:client.status,mockHealth},null,2));
}else if(command==='stop'){
 const pid=await owned();if(!pid){console.log('Owned Host is stopped');process.exit(0);}process.kill(pid,'SIGTERM');for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,250));if(!await owned()){console.log('Owned Host stopped normally');process.exit(0);}}throw Error('Shutdown still pending; no force signal sent');
 }else if(command==='open'||command==='check-ui'||command==='check-auth'){
 if(!await owned())throw Error('Start the Host first');
 const log=openSync(scratch+'/browser-control.log','a',0o600);
 const child=spawn(process.execPath,['scripts/dsh-test-browser.mjs',command==='open'?'open':command==='check-auth'?'check-auth':'check'],{detached:command==='open',stdio:command==='open'?['ignore',log,log]:'inherit',env:process.env});closeSync(log);
 if(command==='open'){child.unref();console.log('Opening authenticated mygo client in isolated Chromium');}
 else {process.exitCode=await new Promise(r=>child.once('exit',r));}
}else throw Error('Usage: node scripts/dsh-test-host.mjs {start|status|stop|open|check-ui|check-auth|check-submit}');
