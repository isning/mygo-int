// Prepare an ignored local install anchor for the status and index-injections live smoke.
// Requires the unmodified pinned artifact build; never edits upstream files.
import {mkdirSync,cpSync,readdirSync,symlinkSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=process.cwd(), up=resolve('.scratch/upstream/deepseek-harness'), anchor=resolve('.scratch/status-live/anchor');
mkdirSync(anchor,{recursive:true});
cpSync(join(up,'apps/cli/lib'),join(anchor,'lib'),{recursive:true});
cpSync(join(up,'apps/cli/package.json'),join(anchor,'package.json'));
function links(source,target){mkdirSync(target,{recursive:true}); for(const row of readdirSync(source,{withFileTypes:true})){if(row.name.startsWith('.') )continue; const a=join(source,row.name),b=join(target,row.name); if(row.name.startsWith('@')) links(a,b); else if(!existsSync(b))symlinkSync(a,b);}}
links(join(up,'apps/cli/node_modules'),join(anchor,'node_modules'));
for(const [name,path] of [['dsh-client-connection','packages/client/connection'],['dsh-client-modules','packages/client/modules']]) {const dest=join(anchor,'node_modules/@deepseek-ai',name); if(!existsSync(dest))symlinkSync(join(up,path),dest);}
mkdirSync(join(anchor,'node_modules/@mygo'),{recursive:true});
cpSync(join(root,'packages/dsh-host-status'),join(anchor,'node_modules/@mygo/dsh-host-status'),{recursive:true});
const manifest=JSON.parse(readFileSync(join(anchor,'package.json'),'utf8'));
manifest.dependencies['@mygo/dsh-host-status']='0.1.0';
manifest.dependencies['@deepseek-ai/dsh-client-connection']='0.2.2-rc.1';
manifest.dependencies['@deepseek-ai/dsh-client-modules']='0.2.2-rc.1';
writeFileSync(join(anchor,'package.json'),JSON.stringify(manifest,null,2));
writeFileSync(join(anchor,'smoke.mjs'),`import {runProfile} from './lib/profile-boot.js';
import {loadLayeredEnv} from '@deepseek-ai/dsh-app-boot';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import http from 'node:http';
const result={};
const {ctx,shutdown}=await runProfile({environment:loadLayeredEnv('dsh'),profile:'web',patchFiles:[${JSON.stringify(join(root,'packages/dsh-host-status/host.patch.yml'))}],args:['--host','127.0.0.1','--port','0','--no-open']});
try {
 const origin=ctx.webServer.getOrigin();
 const req=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const r=http.request(new URL(path,origin),{headers,method,agent:false},s=>{let body='';s.on('data',c=>body+=c);s.on('end',()=>resolve({status:s.statusCode,headers:s.headers,body}));});r.on('error',reject);r.end();});
 const check=async(name,path,headers,expected,method)=>{const r=await req(path,headers,method);assert.equal(r.status,expected,name);result[name]={status:r.status,cacheControl:r.headers['cache-control']};return r;};
 await check('missingAuth','/mygo/status',{},401);
 const launch=new URL(ctx.connection.authenticatedUrl(origin+'/'));
 await check('statusDoesNotExchangeToken','/mygo/status'+launch.search,{},401);
 const login=await req(launch.pathname+launch.search);assert.equal(login.status,303);assert.ok(login.headers['set-cookie']);result.login={status:login.status};
 const cookie=login.headers['set-cookie'].map(x=>x.split(';')[0]).join('; ');
 const owner=await check('owner','/mygo/status',{cookie},200);const body=JSON.parse(owner.body);assert.equal(body.schemaVersion,1);assert.equal(body.status,'adapter-ready');assert.equal(body.adapterVersion,'0.1.0');assert.equal(body.release.version,'0.2.2-rc.1');assert.equal(owner.headers['cache-control'],'no-store');result.owner.body=body;
 await check('sameOrigin','/mygo/status',{cookie,origin},200);
 await check('badHost','/mygo/status',{cookie,host:'untrusted.invalid'},403);
 await check('badOrigin','/mygo/status',{cookie,origin:'http://untrusted.invalid'},403);
 await check('crossSite','/mygo/status',{cookie,'sec-fetch-site':'cross-site'},403);
 const post=await check('post','/mygo/status',{cookie},405,'POST');assert.equal(post.headers.allow,'GET');
 await check('query','/mygo/status?probe=1',{cookie},200);
 // Observe the real admission and collector without changing either result.
 const originalAdmit=ctx.connection.admit.bind(ctx.connection);
 const originalCollect=ctx.webServer.collectIndexInjections.bind(ctx.webServer);
 let admittedPeer, collectedRows, collectionCount=0;
 ctx.connection.admit=req=>{const admission=originalAdmit(req);admittedPeer=admission.peer;return admission;};
 ctx.webServer.collectIndexInjections=peer=>{assert.equal(peer,admittedPeer,'exact admitted Peer');collectionCount++;collectedRows=originalCollect(peer);return collectedRows;};
 const injectionPath='/mygo/index-injections';
 await check('injectionsMissingAuth',injectionPath,{},401);
 await check('injectionsTokenOnly',injectionPath+launch.search,{},401);
 await check('injectionsBadHost',injectionPath,{cookie,host:'untrusted.invalid'},403);
 await check('injectionsBadOrigin',injectionPath,{cookie,origin:'http://untrusted.invalid'},403);
 await check('injectionsCrossSite',injectionPath,{cookie,'sec-fetch-site':'cross-site'},403);
 const injectionPost=await check('injectionsPost',injectionPath,{cookie},405,'POST');assert.equal(injectionPost.headers.allow,'GET');
 assert.equal(collectionCount,0,'denials never collect');
 const verifyInjections=async(name,path=injectionPath)=>{
   const before=collectionCount;
   const response=await check(name,path,{cookie,origin},200);
   assert.equal(collectionCount,before+1,'one synchronous collection per request');
   assert.equal(response.headers['cache-control'],'no-store');
   assert.equal(response.headers['content-type'],'application/json; charset=utf-8');
   const payload=JSON.parse(response.body);
   assert.deepEqual(payload,{schemaVersion:1,injections:collectedRows});
   assert.equal(admittedPeer.principal.kind,'owner');
   assert.ok(payload.injections.some(row=>row.kind==='global'&&row.name==='__DSH_BOOT__'));
   assert.ok(payload.injections.some(row=>row.kind==='script'));
   assert.ok(payload.injections.some(row=>row.kind==='script-src'));
   result[name].rowCount=payload.injections.length;
   result[name].kinds=payload.injections.map(row=>row.kind);
   return payload.injections;
 };
 await verifyInjections('injectionsOwner');
 await verifyInjections('injectionsQuery',injectionPath+'?probe=1');
 // Real event listeners exercise prepend/append, duplicate rows and live state.
 let generation=1;
 const stopProbe=ctx.on('webserver/index-inject',(table,peer)=>{
   assert.equal(peer,admittedPeer);
   table.unshift({kind:'style',text:':root{--mygo-probe:'+generation+'}'});
   table.push({kind:'html',placement:'body',html:'<i data-mygo-probe></i>'});
   table.push({kind:'html',placement:'body',html:'<i data-mygo-probe></i>'});
 });
 try {
   const first=await verifyInjections('injectionsOrdered');
   assert.deepEqual(first[0],{kind:'style',text:':root{--mygo-probe:1}'});
   assert.deepEqual(first.slice(-2),[{kind:'html',placement:'body',html:'<i data-mygo-probe></i>'},{kind:'html',placement:'body',html:'<i data-mygo-probe></i>'}]);
   generation=2;
   const second=await verifyInjections('injectionsFresh');
   assert.equal(second[0].text,':root{--mygo-probe:2}');
 } finally {stopProbe();}

 const entry=[...ctx.loader.entries()].find(e=>e.options.name==='@mygo/dsh-host-status');assert.ok(entry?.fiber,'live Loader entry');result.loader={name:entry.options.name,active:true};
 await entry.update({disabled:true});await ctx.loader.await();
 const after=await req('/mygo/status',{cookie});assert.notEqual(after.status,200);assert.ok(!after.body.includes('adapter-ready'));result.unloaded={status:after.status,fiberState:entry.fiber?.state,disabled:entry.disabled};assert.equal(entry.fiber?.state,4);
 await check('injectionsUnloaded',injectionPath,{cookie},404);
 await entry.update({disabled:false});await ctx.loader.await();
 await check('reloaded','/mygo/status',{cookie},200);
 await verifyInjections('injectionsReloaded');
 ctx.connection.admit=originalAdmit;ctx.webServer.collectIndexInjections=originalCollect;
 await shutdown.shutdown(0);
 try{await req('/mygo/status',{cookie});throw Error('listener still alive');}catch(e){assert.equal(e.code,'ECONNREFUSED');result.teardown={connectionRefused:true};}
 writeFileSync(${JSON.stringify(resolve('.scratch/status-live/result.json'))},JSON.stringify(result,null,2)+'\\n',{mode:0o600});
 process.exit(0);
} catch(e){await shutdown.shutdown(0);throw e;}
`);

writeFileSync(join(anchor, 'types.ts'), `import { apply, type StatusResponse, type IndexInjectionsResponse, INDEX_INJECTIONS_PATH } from '@mygo/dsh-host-status';
import type { Context } from '@deepseek-ai/cordis';
const plugin: (ctx: Context) => void = apply;
const response: StatusResponse = {schemaVersion: 1, status: 'adapter-ready', adapterVersion: '0.1.0', release: null};
const injections: IndexInjectionsResponse = {schemaVersion: 1, injections: [{kind: 'global', name: 'test', value: null}]};
void [plugin, response, injections, INDEX_INJECTIONS_PATH];
`);
