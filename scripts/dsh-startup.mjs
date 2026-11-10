#!/usr/bin/env node
// Serve the official compiled entry in a mygo-owned document, without bootstrap.
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const html = template.replace('<!-- DSH_ASSETS -->', assets.join('\n    '))
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), html)
console.log(`Built ${output}/index.html using the original DSH entry (${assets.length} asset tags)`)
if (command === 'serve') {
  const port = Number(process.env.PORT ?? 4178)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.map': 'application/json' }
  const assetRoot = await realpath(resolve(dist, 'assets'))
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end()
        return
      }
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      let data, extension
      if (path === '/' || path === '/index.html') {
        data = html
        extension = '.html'
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
  server.listen(port, '127.0.0.1', () => console.log(`DSH startup: http://127.0.0.1:${port} (Ctrl-C to stop)`))
  server.on('error', error => { console.error(error); process.exitCode = 1 })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close())
}
