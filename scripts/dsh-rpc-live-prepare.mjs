// Build only an owned harness; shared startup files and original sources stay untouched.
import './dsh-status-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = process.cwd()
const anchor = resolve('.scratch/status-live/anchor')
const existing = readFileSync(`${anchor}/smoke.mjs`, 'utf8')
const prefix = existing.slice(0, existing.indexOf('try {'))
const up = resolve('.scratch/upstream/deepseek-harness')
writeFileSync(`${anchor}/rpc-smoke.mjs`, prefix + `
let server,client,dispose;
try {
const {Context}=await import('@deepseek-ai/cordis');
const {installConnection}=await import('@deepseek-ai/dsh-client-connection/client');
const registry=await import(${JSON.stringify(up + '/packages/typert/registry/lib/client.node.js')});
const gateway=await import(${JSON.stringify(up + '/packages/api/gateway/lib/client.node.js')});
const {default:contribution}=await import(${JSON.stringify(up + '/packages/host/plugin-inventory/lib/typert.remote-client.js')});
const {createInventoryRpcCarrier}=await import(${JSON.stringify(root + '/scripts/dsh-rpc-carrier.mjs')});
const {writeFile}=await import('node:fs/promises');
 const origin=ctx.webServer.getOrigin();
 const login=await fetch(ctx.connection.authenticatedUrl(origin+'/'),{redirect:'manual'});
 assert.equal(login.status,303);
 const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 const carrier=createInventoryRpcCarrier({origin,cookie});
 server=http.createServer((req,res)=>{void carrier(req,res).then(handled=>{if(!handled)res.writeHead(404).end()})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/';
 client=new Context();
 registry.apply(client);
 installConnection(client,{interactions:'none',location:{hostname:'target.invalid'},transport:{openStream:()=>{throw Error('Streams unavailable in unary proof')},fetch:(input,init)=>fetch(new URL(input,base),init)}});
 assert.equal(client.connection.isLoopback,false);
 gateway.apply(client);
 dispose=await client.remote.$mount(contribution);
 const inventory=await client.remote.pluginInventory.list();
 assert.equal(inventory.ok,true,JSON.stringify(inventory));
 assert.ok(inventory.value.entries.length>0);
 assert.deepEqual(inventory.value.entries.map(e=>e.moduleName),[...ctx.loader.entries()].filter(e=>!e.options.group).map(e=>e.options.name));
 assert.ok(inventory.value.entries.some(e=>e.moduleName==='@mygo/dsh-host-status'));
 const wire={type:'client-request',rpcId:'denial-probe',method:'pluginInventory/list',payload:{args:{}}};
 const post=(url,headers={},body=wire)=>fetch(new URL(url,base),{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await post('api/pluginInventory/list',{origin:'http://untrusted.invalid'})).status,403);
 assert.equal((await post('api/pluginInventory/delete')).status,403);
 assert.equal((await post('api/pluginInventory/list',{}, {...wire,method:'settings/mutate'})).status,400);
 const unauth=await fetch(origin+'/api/pluginInventory/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(wire)});
 assert.equal(unauth.status,401);
 // A separate capability with an invalid credential must surface through original Remote errors.
 const deniedCarrier=createInventoryRpcCarrier({origin,cookie:'invalid=credential'});
 const deniedServer=http.createServer((req,res)=>{void deniedCarrier(req,res)});
 await new Promise(r=>deniedServer.listen(0,'127.0.0.1',r));
 try {
   // Preserve original generated method and caller: only switch the physical fetch destination.
   const deniedClient=new Context();registry.apply(deniedClient);
   installConnection(deniedClient,{interactions:'none',location:{hostname:'target.invalid'},transport:{openStream:()=>{throw Error('Streams unavailable in unary proof')},fetch:(input,init)=>fetch(new URL(input,'http://127.0.0.1:'+deniedServer.address().port+'/'),init)}});
   gateway.apply(deniedClient);const unmount=await deniedClient.remote.$mount(contribution);
   try {const failure=await deniedClient.remote.pluginInventory.list();assert.equal(failure.ok,false);assert.match(failure.error.message,/HTTP 401/);result.denied={code:failure.error.code,message:failure.error.message};}
   finally {await unmount();await deniedClient.fiber.dispose();}
 } finally {await new Promise(r=>deniedServer.close(r));}
 result.method='remote.pluginInventory.list';result.inventory=inventory.value;result.login=303;result.missingAuth=401;
 await writeFile(${JSON.stringify(root + '/.scratch/status-live/rpc-result.json')},JSON.stringify(result,null,2)+'\\n',{mode:0o600});
} finally {
 try {await dispose?.();await client?.fiber.dispose();}
 finally {try {if(server)await new Promise(r=>server.close(r));} finally {await shutdown.shutdown(0);}}
}
process.exit(0);
`)
