import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { createHash } from 'node:crypto'
import { createAuthenticatedCarrier } from '../dsh-authenticated-carrier.mjs'
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)))
const get = (url, headers = {}, method = 'GET', body) => new Promise((resolve, reject) => {
  const req = request(url, {headers, method}, res => { let data=''; res.on('data', x=>data+=x); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data})) })
  req.on('error', reject); req.end(body)
})
test('original browser credential, Host/Origin and arbitrary Remote envelopes reach only fixed DSH target', async () => {
  const seen=[]
  const upstream=createServer((req,res)=>{ seen.push(req.headers); let data='';req.on('data',c=>data+=c);req.on('end',()=>{
    if(req.url==='/?token=private-test-token') {res.writeHead(303,{'set-cookie':'dsh-test=upstream; HttpOnly; SameSite=Strict',location:'./'}).end();return}
    if(req.url==='/upstream-failure'){res.writeHead(503,{'content-type':'text/plain','x-upstream':'original'}).end('original upstream failure');return}
    if(!req.headers.cookie){res.writeHead(401).end();return}
    res.writeHead(200).end(data || 'original')
  }) })
  const origin=await listen(upstream)
  let carrier
  const server=createServer((req,res)=>req.url.startsWith('/mygo-local/admission') ? carrier.admit(req,res) : carrier.handle(req,res,req.url==='/'?'local shell':undefined))
  const publicOrigin=await listen(server)
  carrier=createAuthenticatedCarrier({origin,maxBodyBytes:256})
  const cookieName='dsh-auth-'+createHash('sha256').update(new URL(publicOrigin).host).digest('base64url')
  try {
    assert.equal((await get(publicOrigin)).status,200,'device shell does not depend on remote login')
    const login=await get(publicOrigin+'/?token=private-test-token');assert.equal(login.status,303);assert.equal(login.headers.location,'./');assert.ok(login.headers['set-cookie'])
    const cookie=cookieName+'=browser-owned'
    assert.equal((await get(publicOrigin+'/mygo-local/admission')).status,401,'local changes need original browser admission')
    assert.equal((await get(publicOrigin+'/mygo-local/admission?token=private-test-token')).status,401,'probe never exchanges launch tokens')
    assert.equal((await get(publicOrigin+'/mygo-local/admission',{cookie})).status,204)
    assert.equal((await get(publicOrigin+'/mygo-local/admission',{cookie,origin:'http://evil.invalid'})).status,403)
    assert.equal((await get(publicOrigin+'/mygo-local/admission',{cookie},'POST')).status,403)
    assert.equal((await get(publicOrigin,{cookie})).body,'local shell')
    const envelope=JSON.stringify({method:'session/create',payload:{args:{arbitrary:'untouched'}}})
    const result=await get(publicOrigin+'/api/session/create',{cookie:cookie+'; unrelated=secret',origin:publicOrigin,authorization:'not-forwarded','x-forwarded-host':'evil.invalid'},'POST',envelope)
    assert.equal(result.status,200);assert.equal(result.body,envelope)
    assert.equal(seen.at(-1).cookie,cookie);assert.equal(seen.at(-1).host,new URL(publicOrigin).host);assert.equal(seen.at(-1).origin,publicOrigin)
    assert.equal(seen.at(-1).authorization,undefined);assert.equal(seen.at(-1)['x-forwarded-host'],undefined)
    assert.equal((await get(publicOrigin+'/api/settings/catalog')).status,401)
    const upstreamFailure=await get(publicOrigin+'/upstream-failure');assert.equal(upstreamFailure.status,503);assert.equal(upstreamFailure.headers['x-upstream'],'original');assert.equal(upstreamFailure.body,'original upstream failure')
    assert.equal((await get(publicOrigin+'/api/upload',{cookie},'POST','x'.repeat(257))).status,413)
    assert.equal((await get(publicOrigin,{cookie,origin:'http://evil.invalid'})).status,403)
    assert.equal((await get(publicOrigin,{cookie,host:'evil.invalid'})).status,403)
    assert.throws(()=>createAuthenticatedCarrier({origin:'http://example.com'}))
  } finally {carrier.close();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))])}
})

test('device shell survives an unavailable upstream while Remote forwarding still fails', async () => {
  const upstream = createServer()
  const origin = await listen(upstream)
  await new Promise(resolve => upstream.close(resolve))
  let carrier
  const server = createServer((req, res) => carrier.handle(req, res, req.url === '/' ? 'device shell' : undefined))
  const publicOrigin = await listen(server)
  carrier = createAuthenticatedCarrier({ origin })
  try {
    const shell = await get(publicOrigin)
    assert.equal(shell.status, 200)
    assert.equal(shell.body, 'device shell')
    const failure = await get(publicOrigin + '/api/session/list')
    assert.equal(failure.status, 502)
    assert.equal(failure.headers['content-type'], 'text/plain; charset=utf-8')
    assert.equal(failure.body, 'The selected instance is unavailable')
    assert.equal((await get(publicOrigin, {origin:'http://cross-site.invalid'})).status, 403)
  } finally { carrier.close(); await new Promise(resolve => server.close(resolve)) }
})
