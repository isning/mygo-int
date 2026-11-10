import assert from 'node:assert/strict'
import {test} from 'node:test'
import {request as httpRequest,createServer} from 'node:http'
import {once} from 'node:events'
import {createDownloadCarrier} from '../dsh-download-carrier.mjs'
async function listen(server) { server.listen(0,'127.0.0.1'); await once(server,'listening'); return `http://127.0.0.1:${server.address().port}` }
async function close(server) { await new Promise(r=>server.close(r)) }
test('exact target grants preserve binary responses, failures and custody; deny widened calls',async()=>{
 const calls=[];let status=200,bytes=Buffer.from([0,255,13,10]),type='application/octet-stream'
 const host=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;calls.push({body,headers:req.headers,url:req.url});res.writeHead(status,{'content-type':type,'set-cookie':'hidden=value'}).end(bytes)})
 const origin=await listen(host),targets=[{sessionId:'s',path:'/owned/ticket41.txt'}]
 const handler=createDownloadCarrier({origin,cookie:'owner=private',targets,publicOrigins:['http://100.97.207.47:4186']})
 targets[0].path='/mutated'
 const localServer=createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end()})
 const local=await listen(localServer)
 const envelope=(method='readBytes',args={workspaceFileScopeId:'s',path:'/owned/ticket41.txt',options:{}})=>({type:'client-request',method:'workspaceFiles/'+method,rpcId:'original-id',payload:{args}})
 const send=(message=envelope(),headers={},path='/api/'+message.method)=>fetch(local+path,{method:'POST',headers:{origin:local,'content-type':'application/json',...headers},body:JSON.stringify(message)})
 try{
  let r=await send(undefined,{cookie:'browser=ignored'});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls[0].headers.cookie,'owner=private');assert.equal(calls[0].body,JSON.stringify(envelope()))
  status=403;type='application/json';bytes=Buffer.from('{"original":"denied"}');r=await send();assert.equal(r.status,403);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes)
  status=200;bytes=Buffer.from('{"result":{"ok":false,"error":{"code":"fs/not-found"}}}');r=await send();assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes)
  const count=calls.length
  for(const args of [{workspaceFileScopeId:'other',path:'/owned/ticket41.txt',options:{}},{workspaceFileScopeId:'s',path:'/etc/passwd',options:{}},{workspaceFileScopeId:'s',path:'/owned/ticket41.txt',options:{baseFile:'elsewhere'}},{workspaceFileScopeId:'s',path:'/owned/ticket41.txt',options:{range:{}}}])assert.equal((await send(envelope('readBytes',args))).status,400)
  for(const headers of [{origin:''},{origin:'http://foreign.invalid'},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}])assert.ok([403,415].includes((await send(undefined,headers)).status),JSON.stringify(headers))
  assert.equal((await send(envelope(),{},'/api/workspaceFiles/readBytes?x=1')).status,400)
  assert.equal((await send(envelope('list'))).status,404)
  assert.equal(calls.length,count)
  status=302;assert.equal((await send()).status,502);assert.equal(calls.length,count+1)
  const raw=async(host,origin)=>new Promise((resolve,reject)=>{const req=httpRequest(local+'/api/workspaceFiles/stat',{method:'POST',headers:{host,origin,'content-type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end(JSON.stringify(envelope('stat',{workspaceFileScopeId:'s',path:'/owned/ticket41.txt'})))})
  assert.equal(await raw('100.97.207.47:4186','http://100.97.207.47:4186'),502)
  assert.equal(await raw('foreign.invalid',local),403)
 }finally{await close(localServer);await close(host)}
})
test('invalid destinations and grants fail closed',()=>{
 for(const origin of ['https://127.0.0.1','http://localhost','http://127.0.0.1/path','http://x@127.0.0.1'])assert.throws(()=>createDownloadCarrier({origin,cookie:'x'}))
 assert.throws(()=>createDownloadCarrier({origin:'http://127.0.0.1',cookie:'x\r\ny'}))
 assert.throws(()=>createDownloadCarrier({origin:'http://127.0.0.1',cookie:'x',targets:[{sessionId:'s',path:''}]}))
})
