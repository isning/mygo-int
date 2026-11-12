#!/usr/bin/env node
import { createCarrierTrust } from './dsh-carrier-trust.mjs'
// Serve the official Web client, with local composition before authenticated bootstrap.
import { readFile, writeFile, mkdir, realpath, rename } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { readLocalStartup } from './dsh-local-startup-config.mjs'
import { createInstanceRouter } from './dsh-instance-router.mjs'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const upstream = resolve(workspace, '.scratch/upstream/deepseek-harness')
const localStartup = await readLocalStartup(workspace,
  process.env.MYGO_STARTUP_CONFIG ?? 'entries/dsh-startup/local/single-root.json')
const dist = resolve(workspace, '.scratch/dsh-single-client/dist')
const output = resolve(workspace, '.scratch/dsh-startup')
const command = process.argv[2]
if (!['build', 'serve'].includes(command) || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/dsh-startup.mjs {build|serve}')
}
execFileSync('bash', [resolve(workspace, 'scripts/dsh-upstream.sh'), 'verify'], { stdio: 'inherit' })
const { readClientBuildRecord } = await import(resolve(upstream, 'scripts/client-build-environment.ts'))
// Upstream validates the declared artifact closure before reuse.
const record = readClientBuildRecord(upstream)
if (!record) throw new Error('Missing original client build record; rebuild artifacts first')
execFileSync(process.execPath, [resolve(workspace, 'scripts/dsh-local-composition-build.mjs')], { cwd: workspace, stdio: 'inherit' })
const original = await readFile(resolve(dist, 'index.html'), 'utf8')
const tags = original.match(/<script\b[^>]*><\/script>|<link\b[^>]*>/g) ?? []
const assets = tags.filter(tag => /(?:src|href)="\.\/assets\//.test(tag))
if (assets.filter(tag => tag.startsWith('<script') && /type="module"/.test(tag)).length !== 1) {
  throw new Error('Expected exactly one original module entry')
}
for (const tag of assets) {
  const path = tag.match(/(?:src|href)="\.\/(assets\/[^"?#]+)"/)?.[1]
  if (!path || path.split('/').includes('..')) throw new Error('Unexpected original asset path')
  await readFile(resolve(dist, path))
}
const template = await readFile(resolve(workspace, 'entries/dsh-startup/index.html'), 'utf8')
const bootTags = '<script>globalThis.__DSH_BOOT_READY__ = Promise.withResolvers()</script>'
const html = template.replace('<!-- DSH_ASSETS -->', bootTags + '\n    ' + assets.join('\n    '))
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), html)
console.log(`Built ${output}/index.html using the original DSH entry (${assets.length} asset tags)`)
if (command === 'serve') {
  const port = Number(process.env.PORT ?? 4178)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const bindHost = process.env.DSH_CLIENT_BIND ?? '127.0.0.1'
  const publicOrigins = process.env.DSH_CLIENT_PUBLIC_ORIGIN ? [process.env.DSH_CLIENT_PUBLIC_ORIGIN] : []
  if (bindHost !== '127.0.0.1' && publicOrigins.length === 0) throw Error('Non-loopback bind requires DSH_CLIENT_PUBLIC_ORIGIN')
  const trusted = createCarrierTrust({ publicOrigins })
  const types = { '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.map': 'application/json' }
  const routeFile = resolve(output, 'instance-routes.json')
  const credentialFile = resolve(output, 'instance-credentials.json')
  const clientConfigFile = resolve(output, 'client-config.json')
  let profiles = []
  try { profiles = JSON.parse(await readFile(routeFile, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  let credentials = { version: 2, entries: {} }
  try { credentials = JSON.parse(await readFile(credentialFile, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  let clientConfig = { version: 1, revision: 0, base: null, overrides: {} }
  try { clientConfig = JSON.parse(await readFile(clientConfigFile, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (clientConfig?.version !== 1 || !Number.isSafeInteger(clientConfig.revision) || clientConfig.revision < 0
    || clientConfig.base !== null && typeof clientConfig.base !== 'string' || !clientConfig.overrides
    || typeof clientConfig.overrides !== 'object' || Array.isArray(clientConfig.overrides)) throw Error('Invalid mygo client configuration')
  let routeWrite = Promise.resolve()
  const writePrivateJSON = async (file, value) => {
    await writeFile(file + '.next', JSON.stringify(value), { mode: 0o600 })
    await rename(file + '.next', file)
  }
  const router = createInstanceRouter({ publicOrigins, profiles, credentials, onRegister(values) {
    routeWrite = routeWrite.then(() => writePrivateJSON(routeFile, values))
    return routeWrite
  }, onCredentials(value) {
    routeWrite = routeWrite.then(() => writePrivateJSON(credentialFile, value))
    return routeWrite
  } })
  await writePrivateJSON(routeFile, router.profiles())
  const assetRoot = await realpath(resolve(dist, 'assets'))
  const server = createServer(async (request, response) => {
    try {
      if (!trusted(request)) { response.writeHead(403).end(); return }
      const originalPath = new URL(request.url, 'http://localhost').pathname
      const route = router?.resolve(request)
      const localPath = originalPath === '/' || originalPath === '/index.html' || originalPath.startsWith('/assets/')
        || originalPath.startsWith('/mygo-local/') || originalPath.startsWith('/mygo-boot/')
      if (router && !route && !localPath) { response.writeHead(410).end('Instance route unavailable; reopen the client entry'); return }
      const carrier = route?.carrier
      const requestPath = new URL(request.url, 'http://localhost').pathname
      if (router && route && request.method === 'GET' && new URL(request.url, 'http://localhost').searchParams.has('token')) {
        await router.loginLink(request, response, route)
        return
      }
      if (router && ['/mygo-local/connection', '/mygo-local/login'].includes(requestPath)) {
        await router.control(request, response, route)
        return
      }
      if (router && requestPath === '/mygo-local/client-config') {
        if (request.method === 'GET') {
          response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(clientConfig))
          return
        }
        if (request.method !== 'PUT' || !request.headers.origin || !request.headers['content-type']?.startsWith('application/json')) {
          response.writeHead(request.method === 'PUT' ? 403 : 405, { allow: 'GET, PUT', 'cache-control': 'no-store' }).end()
          return
        }
        let body = '', size = 0
        for await (const chunk of request) {
          size += chunk.length
          if (size > 1024 * 1024) { response.writeHead(413).end(); return }
          body += chunk
        }
        let value
        try { value = JSON.parse(body) }
        catch { response.writeHead(400, { 'cache-control': 'no-store' }).end(); return }
        if (!value || Object.keys(value).some(key => !['expectedRevision', 'base', 'overrides'].includes(key))
          || value.expectedRevision !== clientConfig.revision || typeof value.base !== 'string' || value.base.length > 256 * 1024
          || !value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides)) {
          response.writeHead(value?.expectedRevision !== clientConfig.revision ? 409 : 400, { 'cache-control': 'no-store' }).end()
          return
        }
        clientConfig = { version: 1, revision: clientConfig.revision + 1, base: value.base, overrides: value.overrides }
        await writePrivateJSON(clientConfigFile, clientConfig)
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(clientConfig))
        return
      }
      if (carrier && requestPath === '/mygo-local/admission') {
        carrier.admit(request, response)
        return
      }
      if (carrier && (requestPath === '/' || requestPath === '/index.html')) {
        carrier.handle(request, response, html)
        return
      }
      if (carrier && !requestPath.startsWith('/assets/') && !requestPath.startsWith('/mygo-local/') && !requestPath.startsWith('/mygo-boot/')) {
        carrier.handle(request, response)
        return
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end()
        return
      }
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      let data, extension
      if (path === '/' || path === '/index.html') {
        data = html
        extension = '.html'
      } else if (path === '/mygo-local/startup.json') {
        data = JSON.stringify({ ...localStartup, instances: router.profiles(), ...(route ? { selectedInstance: route.profile } : {}) })
        extension = '.json'
      } else if (path === '/mygo-local/profile-identity.js') {
        data = await readFile(resolve(workspace, 'entries/dsh-startup/local/profile-identity.js'))
        extension = '.js'
      } else if (/^\/mygo-local\/plugins\/[a-zA-Z0-9_-]+\.js$/.test(path)) {
        const localRoot = await realpath(resolve(workspace, 'entries/dsh-startup/local/plugins'))
        const file = await realpath(resolve(localRoot, path.split('/').at(-1)))
        if (!file.startsWith(localRoot + sep)) throw Error('Outside local plugins')
        data = await readFile(file)
        extension = '.js'
      } else if (['/mygo-boot/instance-route.js', '/mygo-boot/bootstrap.js', '/mygo-boot/apply-injections.js'].includes(path)) {
        data = await readFile(path.endsWith('/bootstrap.js')
          ? resolve(workspace, 'entries/dsh-startup/bootstrap.js') : path.endsWith('/instance-route.js') ? resolve(workspace, 'entries/dsh-startup/instance-route.js')
            : resolve(upstream, 'packages/client/web/lib/apply-injections.js'))
        extension = '.js'
      } else if (path.startsWith('/assets/')) {
        const file = await realpath(resolve(dist, `.${path}`))
        if (!file.startsWith(assetRoot + sep)) throw new Error('Outside assets')
        data = await readFile(file)
        extension = extname(file)
      } else {
        response.writeHead(404).end('Not found')
        return
      }
      response.writeHead(200, { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
      response.end(request.method === 'HEAD' ? undefined : data)
    } catch (error) {
      if (response.headersSent) { response.destroy(error); return }
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
        response.writeHead(404).end('Not found')
      } else if (error instanceof URIError) {
        response.writeHead(400).end('Invalid request path')
      } else {
        console.error('Client request failed', error)
        response.writeHead(500).end('Client request failed')
      }
    }
  })
  if (router) server.on('upgrade', (request, socket, head) => {
    if (!trusted(request, true)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return }
    const route = router.resolve(request)
    if (!route) { socket.end('HTTP/1.1 410 Gone\r\n\r\n'); return }
    route.carrier.upgrade(request, socket, head)
  })
  server.listen(port, bindHost, () => console.log(`DSH startup: ${publicOrigins[0] ?? 'http://127.0.0.1:' + port} (bind ${bindHost}; Ctrl-C to stop)`))
  server.on('error', error => { console.error(error); process.exitCode = 1 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { router?.close(); server.close() })
}
