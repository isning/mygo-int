#!/usr/bin/env node
// Isolated ticket-41 original Host/UI check. Shared helpers are read, never edited.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {spawn} from 'node:child_process'
import net from 'node:net'
process.umask(0o077)
const root=process.cwd(),scratch=resolve('.scratch/download-live'),anchor=scratch+'/anchor'
const probe=net.createServer();await new Promise((r,j)=>{probe.once('error',j);probe.listen(4186,'0.0.0.0',r)});await new Promise(r=>probe.close(r))
await mkdir(scratch,{recursive:true,mode:0o700})
for(const [key,value] of Object.entries({XDG_CACHE_HOME:'.cache',XDG_DATA_HOME:'.data',XDG_STATE_HOME:'.state',PNPM_HOME:'.pnpm',npm_config_cache:'.npm-cache',npm_config_store_dir:'.pnpm-store'}))process.env[key]=resolve('.scratch/upstream',value)
Object.assign(process.env,{DSH_CLIENT_PORT:'4186',DSH_CLIENT_BIND:'0.0.0.0',DSH_CLIENT_PUBLIC_ORIGIN:'http://100.97.207.47:4186',NARB_NATIVE_CACHE_DIR:scratch+'/native-cache',DSH_HOME:scratch+'/home',DSH_AGENTS_HOME:scratch+'/agents',DSH_TELEMETRY_DISABLED:'1',DSH_TEST_PROVIDER:'mock'})
const anchorSource=(await readFile('scripts/dsh-status-live-prepare.mjs','utf8')).replaceAll('.scratch/status-live/anchor','.scratch/download-live/anchor')
await import('data:text/javascript;base64,'+Buffer.from(anchorSource).toString('base64'))
await writeFile(scratch+'/ticket41.txt',Buffer.from('Ticket 41 original Host download\n\0\xff','latin1'))
function replace(source,old,value){if(!source.includes(old))throw Error('Harness source seam changed: '+old);return source.replace(old,value)}
let startup=await readFile('scripts/dsh-startup.mjs','utf8')
startup=replace(startup,"const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')",'const workspace = '+JSON.stringify(root))
startup=replace(startup,"const output = resolve(workspace, '.scratch/dsh-startup')",'const output = '+JSON.stringify(scratch+'/web'))
startup=replace(startup,"'../entries/dsh-startup/session-assets.js'",JSON.stringify(pathToFileURL(root+'/entries/dsh-startup/session-assets.js').href))
for(const name of ['dsh-carrier-trust.mjs','dsh-bootstrap-carrier.mjs','dsh-rpc-carrier.mjs','dsh-session-carrier.mjs','dsh-lazy-carrier.mjs','dsh-upload-carrier.mjs'])startup=startup.replaceAll("'./"+name+"'",JSON.stringify(pathToFileURL(root+'/scripts/'+name).href))
startup=replace(startup,'  const server = createServer',`  const {createDownloadCarrier}=await import(${JSON.stringify(pathToFileURL(root+'/scripts/dsh-download-carrier.mjs').href)})
  const download=createDownloadCarrier({origin:process.env.DSH_ORIGIN,cookie:ownerCookie,publicOrigins,targets:JSON.parse(await readFile(${JSON.stringify(scratch+'/targets.json')},'utf8'))})
  const server = createServer`)
startup=replace(startup,'      if (carrier && await carrier(request, response)) return',`      if (await download(request,response)) return
      if (carrier && await carrier(request, response)) return`)
await writeFile(scratch+'/startup.mjs',startup)
// Only MODEL responses are changed: real present tool records the delivered file.
let model=await readFile('scripts/dsh-model-mock.mjs','utf8')
model=replace(model,"   chunk({role:'assistant',content:''});",`   if(!input.messages.some(x=>x.role==='tool')) {
    chunk({role:'assistant',tool_calls:[{index:0,id:'present-ticket41',type:'function',function:{name:'present',arguments:JSON.stringify({files:[{path:${JSON.stringify(scratch+'/ticket41.txt')}}]})}}]});
    chunk({},'tool_calls');res.end('data: [DONE]\\n\\n');stats.completed++;return;
   }
   chunk({role:'assistant',content:''});`)
model=replace(model,"['Hello! ','This is a deterministic ','local model mock reply.']","['Hello! ','Download the delivered file ','`ticket41.txt`.']")
await writeFile(scratch+'/model.mjs',model)
let modelSetup=await readFile('scripts/dsh-test-model.mjs','utf8');modelSetup=replace(modelSetup,"'./dsh-model-mock.mjs'",JSON.stringify(pathToFileURL(scratch+'/model.mjs').href));await writeFile(scratch+'/model-setup.mjs',modelSetup)
let browser=(await readFile('scripts/dsh-test-browser.mjs','utf8')).replaceAll('.scratch/test-dsh','.scratch/download-live')
const begin=browser.indexOf(' if(submit){'),end=browser.indexOf(" console.log(interactive?",begin)
if(begin<0||end<0)throw Error('Browser harness seam changed')
browser=browser.slice(0,begin)+await readFile('scripts/dsh-download-browser.mjs','utf8')+'\n'+browser.slice(end)
await writeFile(scratch+'/browser.mjs',browser)
let runner=(await readFile('scripts/dsh-test-host-runner.mjs','utf8')).replaceAll('.scratch/test-dsh','.scratch/download-live')
runner=replace(runner,"root+'/scripts/dsh-test-model.mjs'",JSON.stringify(scratch+'/model-setup.mjs'))
runner=replace(runner,"root+'/scripts/dsh-startup.mjs'",JSON.stringify(scratch+'/startup.mjs'))
runner=replace(runner," const log=openSync(scratch+'/carrier.log'",` await writeFile(scratch+'/targets.json',JSON.stringify([{sessionId:fixtureId,path:scratch+'/ticket41.txt'}]));
 const log=openSync(scratch+'/carrier.log'`)
const cut=runner.indexOf(' let checking=false;');if(cut<0)throw Error('Runner harness seam changed')
runner=runner.slice(0,cut)+`
 const browser=spawn(process.execPath,[${JSON.stringify(scratch+'/browser.mjs')},'check-submit'],{stdio:'inherit',env:process.env});
 assert.equal(await new Promise(r=>browser.once('exit',r)),0,'original UI download assertions');
 const expected=await readFile(scratch+'/ticket41.txt'),actual=await readFile(JSON.parse(await readFile(scratch+'/download-browser.json','utf8')).downloadPath);
 assert.deepEqual(actual,expected,'actual browser download equals Host fixture bytes');
 await writeFile(scratch+'/validation.json',JSON.stringify({ok:true,byteExact:true,bytes:actual.length,filename:'ticket41.txt',browser:JSON.parse(await readFile(scratch+'/download-browser.json','utf8'))},null,2));
 await stop(0);
} catch(e){await writeFile(scratch+'/validation.json',JSON.stringify({ok:false,error:e.message}));console.error('Download validation failed:',e.message);await stop(1);}
`
await writeFile(anchor+'/download-host.mjs',runner)
const child=spawn('pnpm',['--config.auto-install-peers=false','dlx','--package=node-linux-x64@24.21.0','node',anchor+'/download-host.mjs'],{stdio:'inherit',env:process.env})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
process.exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('exit',r)})
