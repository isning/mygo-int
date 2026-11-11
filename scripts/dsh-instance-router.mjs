import { createHash } from 'node:crypto'
import { createAuthenticatedCarrier } from './dsh-authenticated-carrier.mjs'
import { createCarrierTrust } from './dsh-carrier-trust.mjs'

export function validateConnectionProfile(value) {
  if (!value || !['id', 'authenticationViewId'].every(key => typeof value[key] === 'string' && /^[\w-]{1,128}$/.test(value[key]))
    || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 128) throw Error('Invalid instance profile')
  const address = new URL(value.address)
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password || address.pathname !== '/' || address.search || address.hash) throw Error('Invalid instance origin')
  return { id: value.id, name: value.name.trim(), address: address.origin, authenticationViewId: value.authenticationViewId }
}

export function createInstanceRouter({ profile, publicOrigins = [], profiles = [], onRegister }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const routes = new Map()
  function register(value) {
    const profile = validateConnectionProfile(value)
    const id = createHash('sha256').update(JSON.stringify(profile)).digest('hex')
    if (!routes.has(id)) {
      if (routes.size >= 256) throw Error('Instance route limit reached')
      const namespace = JSON.stringify([profile.id, profile.address, profile.authenticationViewId])
      routes.set(id, { profile, prefix: '/mygo-instance/' + id, carrier: createAuthenticatedCarrier({ origin: profile.address, publicOrigins, credentialNamespace: namespace, pathPrefix: '/mygo-instance/' + id }) })
    }
    return { ...routes.get(id), id }
  }
  const initial = register(profile)
  for (const saved of profiles) register(saved)
  async function control(req, res, route) {
    if (!trusted(req) || !req.headers.origin) { res.writeHead(403).end(); return }
    if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST' }).end(); return }
    if (!req.headers['content-type']?.startsWith('application/json')) { res.writeHead(415).end(); return }
    let size = 0, body = ''
    try {
      for await (const chunk of req) {
        size += chunk.length
        if (size > 8192) { res.writeHead(413).end(); return }
        body += chunk
      }
      const value = JSON.parse(body)
      if (req.url === '/mygo-local/login') {
        if (typeof value.token !== 'string' || !value.token || value.token.length > 4096) throw Error('Invalid login token')
        route.carrier.login(req, res, value.token)
        return
      }
      const next = register(value)
      await onRegister?.([...routes.values()].map(route => route.profile))
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        .end(JSON.stringify({ url: next.prefix + '/', profile: next.profile }))
    } catch {
      if (!res.headersSent) res.writeHead(400, { 'cache-control': 'no-store' }).end()
    }
  }
  return {
    initial,
    resolve(req) {
      const path = new URL(req.url, 'http://localhost').pathname
      if (!path.startsWith('/mygo-instance/')) return initial
      const match = /^\/mygo-instance\/([a-f0-9]{64})(\/.*)$/.exec(req.url)
      const route = match && routes.get(match[1])
      if (!route) return undefined
      req.url = match[2]
      return route
    },
    control,
    close() { for (const route of routes.values()) route.carrier.close() },
  }
}
