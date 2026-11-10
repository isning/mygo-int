#!/usr/bin/env node
// Persistent owned local Host controller; never prints credentials or launch URLs.
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
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
 const p=spawnSync(process.execPath,['scripts/dsh-status-live-prepare.mjs'],{stdio:'inherit'});if(p.status!==0)process.exit(1);
 await copyFile('scripts/dsh-test-host-runner.mjs',anchor+'/test-host.mjs');
 // Clear stale readiness by replacing it with a safe starting marker.
 await writeFile(scratch+'/status.json',JSON.stringify({starting:true}));
 const log=openSync(scratch+'/runtime.log','a',0o600);
 const child=spawn('pnpm',['--config.auto-install-peers=false','dlx','--package=node-linux-x64@24.21.0','node',anchor+'/test-host.mjs'],{cwd:root,env:process.env,detached:true,stdio:['ignore',log,log]});child.unref();closeSync(log);
 for(let i=0;i<480;i++){await new Promise(r=>setTimeout(r,250));const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));if(!status.starting&&await owned()){console.log(JSON.stringify(status,null,2));process.exit(0);}}
 throw Error('Startup not ready after 120 seconds; inspect private runtime.log');
}else if(command==='status'){
 if(!await owned())throw Error('Owned Host is stopped');
 const status=JSON.parse(await readFile(scratch+'/status.json','utf8'));
 const [host,client]=await Promise.all([fetch(status.origin+'/mygo/status'),fetch(status.clientUrl)]);
 console.log(JSON.stringify({...status,unauthenticatedHostStatus:host.status,clientStatus:client.status},null,2));
}else if(command==='stop'){
 const pid=await owned();if(!pid){console.log('Owned Host is stopped');process.exit(0);}process.kill(pid,'SIGTERM');for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,250));if(!await owned()){console.log('Owned Host stopped normally');process.exit(0);}}throw Error('Shutdown still pending; no force signal sent');
 }else if(command==='open'||command==='check-ui'||command==='check-auth'){
 if(!await owned())throw Error('Start the Host first');
 const log=openSync(scratch+'/browser-control.log','a',0o600);
 const child=spawn(process.execPath,['scripts/dsh-test-browser.mjs',command==='open'?'open':command==='check-auth'?'check-auth':'check'],{detached:command==='open',stdio:command==='open'?['ignore',log,log]:'inherit',env:process.env});closeSync(log);
 if(command==='open'){child.unref();console.log('Opening authenticated official Host UI in isolated Chromium');}
 else {process.exitCode=await new Promise(r=>child.once('exit',r));}
}else throw Error('Usage: node scripts/dsh-test-host.mjs {start|status|stop|open|check-ui|check-auth}');
