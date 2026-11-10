#!/usr/bin/env node
// Serve the unchanged official entry, with an optional narrow bootstrap carrier.
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SESSION_ASSETS } from '../entries/dsh-startup/session-assets.js'
import { execFileSync } from 'node:child_process'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const upstream = resolve(workspace, '.scratch/upstream/deepseek-harness')
const dist = resolve(upstream, 'apps/web/dist')
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
const bootEnabled = Boolean(process.env.DSH_ORIGIN)
if (bootEnabled !== Boolean(process.env.DSH_COOKIE_FILE)) throw new Error('Set both DSH_ORIGIN and DSH_COOKIE_FILE')
const bootTags = bootEnabled ? '<script>globalThis.__DSH_BOOT_READY__ = Promise.withResolvers()</script>\n    <script type="module" src="/mygo-boot/bootstrap.js"></script>' : ''
const html = template.replace('<!-- DSH_ASSETS -->', bootTags + '\n    ' + assets.join('\n    '))
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), html)
console.log(`Built ${output}/index.html using the original DSH entry (${assets.length} asset tags)`)
if (command === 'serve') {
  const port = Number(process.env.PORT ?? 4178)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.map': 'application/json' }
  const ownerCookie = bootEnabled ? (await readFile(process.env.DSH_COOKIE_FILE, 'utf8')).trim() : undefined
  const carrier = bootEnabled ? (await import('./dsh-bootstrap-carrier.mjs')).createBootstrapCarrier({
    origin: process.env.DSH_ORIGIN, cookie: ownerCookie,
  }) : undefined
  const inventoryRpcCarrier = bootEnabled ? (await import('./dsh-rpc-carrier.mjs')).createInventoryRpcCarrier({
    origin: process.env.DSH_ORIGIN, cookie: ownerCookie,
  }) : undefined
  const { createSessionCarrier, loadOriginalSocketLibrary } = await import('./dsh-session-carrier.mjs')
  const socketLibrary = bootEnabled ? loadOriginalSocketLibrary(workspace) : undefined
  const sessionCarrier = bootEnabled ? createSessionCarrier({ origin: process.env.DSH_ORIGIN, cookie: ownerCookie, WebSocket: socketLibrary.WebSocket, WebSocketServer: socketLibrary.WebSocketServer }) : undefined
  const assetRoot = await realpath(resolve(dist, 'assets'))
  const server = createServer(async (request, response) => {
    try {
      if (carrier && await carrier(request, response)) return
      if (sessionCarrier && await sessionCarrier.handle(request, response)) return
      if (inventoryRpcCarrier && await inventoryRpcCarrier(request, response)) return
      if (SESSION_ASSETS.has(request.url.slice(1)) && carrier) {
        const localOrigin = `http://127.0.0.1:${request.socket.localPort}`
        if (request.method !== 'GET' || request.headers.host !== new URL(localOrigin).host || (request.headers.origin && request.headers.origin !== localOrigin) || (request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site']))) { response.writeHead(403).end(); return }
        const result = await fetch(new URL(request.url, process.env.DSH_ORIGIN), { headers: { cookie: ownerCookie }, redirect: 'error', signal: AbortSignal.timeout(15000) })
        response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Security-Policy': "script-src 'none'", 'X-Content-Type-Options': 'nosniff' }).end(new Uint8Array(await result.arrayBuffer()))
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
      } else if (bootEnabled && ['/mygo-boot/session-assets.js', '/mygo-boot/bootstrap.js', '/mygo-boot/apply-injections.js', '/mygo-boot/bundle-references.js'].includes(path)) {
        data = await readFile(path.endsWith('/session-assets.js') ? resolve(workspace, 'entries/dsh-startup/session-assets.js') : path.endsWith('/bootstrap.js')
          ? resolve(workspace, 'entries/dsh-startup/bootstrap.js')
          : path.endsWith('/bundle-references.js')
            ? resolve(workspace, 'scripts/dsh-bootstrap-carrier.mjs')
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
    } catch {
      response.writeHead(404).end('Not found')
    }
  })
  if (sessionCarrier) server.on('upgrade', (request, socket, head) => sessionCarrier.upgrade(request, socket, head))
  server.listen(port, '127.0.0.1', () => console.log(`DSH startup: http://127.0.0.1:${port} (Ctrl-C to stop)`))
  server.on('error', error => { console.error(error); process.exitCode = 1 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { sessionCarrier?.close(); server.close() })
}
