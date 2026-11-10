#!/usr/bin/env node
// One-shot owned issue-40 harness. Derive private runners without editing shared files.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {spawn} from 'node:child_process'
import net from 'node:net'
process.umask(0o077)
const root=process.cwd(), scratch=resolve('.scratch/upload-live'), anchor=scratch+'/anchor'
// Fail before booting if the assigned port belongs to another workflow.
const probe=net.createServer()
await new Promise((r,j)=>{probe.once('error',j);probe.listen(4183,'127.0.0.1',r)})
await new Promise(r=>probe.close(r))
await mkdir(scratch,{recursive:true,mode:0o700})
for(const [key,value] of Object.entries({XDG_CACHE_HOME:'.cache',XDG_DATA_HOME:'.data',XDG_STATE_HOME:'.state',PNPM_HOME:'.pnpm',npm_config_cache:'.npm-cache',npm_config_store_dir:'.pnpm-store'}))process.env[key]=resolve('.scratch/upstream',value)
Object.assign(process.env,{DSH_CLIENT_PORT:'4183',NARB_NATIVE_CACHE_DIR:scratch+'/native-cache',DSH_HOME:scratch+'/home',DSH_AGENTS_HOME:scratch+'/agents',DSH_TELEMETRY_DISABLED:'1',DSH_TEST_PROVIDER:'mock'})
const anchorSource=(await readFile('scripts/dsh-status-live-prepare.mjs','utf8')).replaceAll('.scratch/status-live/anchor','.scratch/upload-live/anchor')
await import('data:text/javascript;base64,'+Buffer.from(anchorSource).toString('base64'))
await writeFile(scratch+'/ticket40.txt',Buffer.from('Ticket 40 original Host upload\n\0\xff','latin1'))
function replace(source,old,value){if(!source.includes(old))throw Error('Harness source seam changed: '+old);return source.replace(old,value)}
let startup=await readFile('scripts/dsh-startup.mjs','utf8')
startup=replace(startup,"const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')",'const workspace = '+JSON.stringify(root))
startup=replace(startup,"const output = resolve(workspace, '.scratch/dsh-startup')",'const output = '+JSON.stringify(scratch+'/web'))
startup=replace(startup,"'../entries/dsh-startup/session-assets.js'",JSON.stringify(pathToFileURL(root+'/entries/dsh-startup/session-assets.js').href))
for(const name of ['dsh-bootstrap-carrier.mjs','dsh-rpc-carrier.mjs','dsh-session-carrier.mjs'])startup=startup.replaceAll("'./"+name+"'",JSON.stringify(pathToFileURL(root+'/scripts/'+name).href))
startup=replace(startup,'  const server = createServer',`  const {createUploadCarrier} = await import(${JSON.stringify(pathToFileURL(root+'/scripts/dsh-upload-carrier.mjs').href)})
  const upload = createUploadCarrier({origin:process.env.DSH_ORIGIN,cookie:ownerCookie})
  const uploads=[]
  const server = createServer`)
startup=replace(startup,'      if (carrier && await carrier(request, response)) return',`      if(request.url.startsWith('/api/session/uploadFileBinary')) {
        const end=response.end.bind(response)
        response.end=(body,...args)=>{uploads.push({url:request.url,status:response.statusCode,body:body?Buffer.from(body).toString():''});void writeFile(${JSON.stringify(scratch+'/upload-network.json')},JSON.stringify(uploads,null,2));return end(body,...args)}
      }
      if (await upload(request,response)) return
      if (carrier && await carrier(request, response)) return`)
await writeFile(scratch+'/startup.mjs',startup)
let browser=await readFile('scripts/dsh-test-browser.mjs','utf8')
browser=browser.replaceAll('.scratch/test-dsh','.scratch/upload-live')
const begin=browser.indexOf(' if(submit){'),end=browser.indexOf(" console.log(interactive?",begin)
if(begin<0||end<0)throw Error('Browser harness seam changed')
browser=browser.slice(0,begin)+await readFile('scripts/dsh-upload-browser.mjs','utf8')+'\n'+browser.slice(end)
await writeFile(scratch+'/browser.mjs',browser)
let runner=(await readFile('scripts/dsh-test-host-runner.mjs','utf8')).replaceAll('.scratch/test-dsh','.scratch/upload-live')
runner=replace(runner,"root+'/scripts/dsh-startup.mjs'",JSON.stringify(scratch+'/startup.mjs'))
const cut=runner.indexOf(' let checking=false;')
if(cut<0)throw Error('Runner harness seam changed')
runner=runner.slice(0,cut)+`
 const browser=spawn(process.execPath,[${JSON.stringify(scratch+'/browser.mjs')},'check-submit'],{stdio:'inherit',env:process.env});
 assert.equal(await new Promise(r=>browser.once('exit',r)),0,'original UI upload assertions');
 const network=JSON.parse(await readFile(scratch+'/upload-network.json','utf8'));
 const successful=network.filter(x=>x.status===200&&JSON.parse(x.body).ok);
 assert.equal(successful.length,1,'one successful original upload');
 const receipt=JSON.parse(successful[0].body).value;
 assert.ok(receipt.receiptId,'original receipt');
 const chunks=[];for await(const bytes of ctx.attachments.readFileStream(receipt.file))chunks.push(bytes);
 const actual=Buffer.concat(chunks),expected=await readFile(scratch+'/ticket40.txt');
 assert.deepEqual(actual,expected,'Host stored exact browser-selected bytes');
 assert.equal(receipt.file.bytes,expected.length);
 await writeFile(scratch+'/validation.json',JSON.stringify({ok:true,receipt,storedBytes:actual.length,byteExact:true,browser:JSON.parse(await readFile(scratch+'/upload-browser.json','utf8'))},null,2));
 await stop(0);
} catch(e){await writeFile(scratch+'/validation.json',JSON.stringify({ok:false,error:e.message}));console.error('Upload validation failed:',e.message);await stop(1);}
`
await writeFile(anchor+'/upload-host.mjs',runner)
const child=spawn('pnpm',['--config.auto-install-peers=false','dlx','--package=node-linux-x64@24.21.0','node',anchor+'/upload-host.mjs'],{stdio:'inherit',env:process.env})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
process.exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('exit',r)})
