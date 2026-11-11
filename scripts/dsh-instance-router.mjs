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

const digest = value => createHash('sha256').update(value).digest('hex')

export function createInstanceRouter({ profile, publicOrigins = [], profiles = [], onRegister, credentials = { version: 1, entries: {} }, onCredentials }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const routes = new Map()
  if (credentials?.version !== 1 || !credentials.entries || typeof credentials.entries !== 'object' || Array.isArray(credentials.entries)) throw Error('Invalid instance credentials')
  for (const [credentialId, devices] of Object.entries(credentials.entries)) {
    if (!/^[a-f0-9]{64}$/.test(credentialId) || !devices || typeof devices !== 'object' || Array.isArray(devices)
      || typeof devices.token !== 'string' || !devices.token || devices.token.length > 4096
      || typeof devices.cookie !== 'string' || !/^dsh-auth-[A-Za-z0-9_-]+=[^;\r\n]+$/.test(devices.cookie)
      || Object.keys(devices).some(key => !['token', 'cookie'].includes(key))) throw Error('Invalid instance credentials')
  }
  let savedCredentials = structuredClone(credentials)
  function register(value) {
    const profile = validateConnectionProfile(value)
    const id = createHash('sha256').update(JSON.stringify(profile)).digest('hex')
    const credentialId = digest(JSON.stringify([profile.id, profile.address, profile.authenticationViewId]))
    if (!routes.has(id)) {
      if (routes.size >= 256) throw Error('Instance route limit reached')
      const namespace = JSON.stringify([profile.id, profile.address, profile.authenticationViewId])
      const route = { id, profile, credentialId, credential: savedCredentials.entries[credentialId], prefix: '/mygo-instance/' + id }
      route.carrier = createAuthenticatedCarrier({ origin: profile.address, publicOrigins, credentialNamespace: namespace, pathPrefix: route.prefix, getCredential: () => route.credential?.cookie })
      routes.set(id, route)
    }
    return routes.get(id)
  }
  const initial = register(profile)
  for (const saved of profiles) register(saved)
  async function authenticate(req, res, route, token, options) {
    await route.carrier.login(req, res, token, {
      ...options,
      async onAccepted(cookie) {
        const entries = structuredClone(savedCredentials.entries)
        entries[route.credentialId] = { token, cookie }
        savedCredentials = { version: 1, entries }
        route.credential = entries[route.credentialId]
        await onCredentials?.(savedCredentials)
      },
    })
  }
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
        const supplied = typeof value.token === 'string' && value.token.length > 0
        if (value.token !== undefined && (!supplied || value.token.length > 4096) || Object.keys(value).some(key => key !== 'token')) throw Error('Invalid login token')
        const token = supplied ? value.token : route.credential?.token
        if (!token) { res.writeHead(404, { 'cache-control': 'no-store' }).end(); return }
        await authenticate(req, res, route, token)
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
    async loginLink(req, res, route) {
      if (!trusted(req) || req.method !== 'GET') { res.writeHead(403).end(); return }
      const url = new URL(req.url, 'http://localhost')
      if ([...url.searchParams.keys()].some(key => key !== 'token') || url.searchParams.getAll('token').length !== 1) { res.writeHead(400).end(); return }
      const token = url.searchParams.get('token')
      if (!token || token.length > 4096) { res.writeHead(400).end(); return }
      await authenticate(req, res, route, token, { successStatus: 303, successHeaders: { location: route.prefix + '/' } })
    },
    close() { for (const route of routes.values()) route.carrier.close() },
  }
}
