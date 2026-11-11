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

export function createInstanceRouter({ connectedProfile, publicOrigins = [], profiles = [], onRegister, credentials = { version: 2, entries: {} }, onCredentials }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const routes = new Map()
  const aliases = new Map()
  const current = new Map()
  if (![1, 2].includes(credentials?.version) || !credentials.entries || typeof credentials.entries !== 'object' || Array.isArray(credentials.entries)) throw Error('Invalid instance credentials')
  for (const [credentialId, value] of Object.entries(credentials.entries)) {
    if (!/^[a-f0-9]{64}$/.test(credentialId) || !value || typeof value !== 'object' || Array.isArray(value)
      || typeof value.token !== 'string' || !value.token || value.token.length > 4096
      || typeof value.cookie !== 'string' || !/^dsh-auth-[A-Za-z0-9_-]+=[^;\r\n]+$/.test(value.cookie)
      || credentials.version === 2 && (typeof value.address !== 'string' || new URL(value.address).origin !== value.address)
      || Object.keys(value).some(key => !['address', 'token', 'cookie'].includes(key))) throw Error('Invalid instance credentials')
  }
  let savedCredentials = credentials.version === 2 ? structuredClone(credentials) : { version: 2, entries: {} }
  if (credentials.version === 1) {
    for (const candidate of [...profiles, connectedProfile].map(validateConnectionProfile)) {
      const legacyId = digest(JSON.stringify([candidate.id, candidate.address, candidate.authenticationViewId]))
      const credentialId = digest(JSON.stringify([candidate.id, candidate.authenticationViewId]))
      if (credentials.entries[legacyId]) savedCredentials.entries[credentialId] = { address: candidate.address, ...credentials.entries[legacyId] }
    }
  }
  function register(value) {
    const profile = validateConnectionProfile(value)
    const id = createHash('sha256').update(JSON.stringify(profile)).digest('hex')
    const profileKey = JSON.stringify([profile.id, profile.authenticationViewId])
    const credentialId = digest(JSON.stringify([profile.id, profile.authenticationViewId]))
    if (routes.has(id)) return routes.get(id)
    if (routes.size + aliases.size >= 256) throw Error('Instance route limit reached')
    const namespace = JSON.stringify([profile.id, profile.address, profile.authenticationViewId])
    const route = { id, profile, credentialId, credential: savedCredentials.entries[credentialId], prefix: '/mygo-instance/' + id }
    route.carrier = createAuthenticatedCarrier({ origin: profile.address, publicOrigins, credentialNamespace: namespace, pathPrefix: route.prefix, getCredential: () => route.credential?.address === profile.address ? route.credential.cookie : undefined })
    const previous = current.get(profileKey)
    if (previous) {
      routes.delete(previous.id)
      aliases.set(previous.id, route)
      for (const [alias, target] of aliases) if (target === previous) aliases.set(alias, route)
      previous.carrier.close()
    }
    routes.set(id, route)
    current.set(profileKey, route)
    return route
  }
  for (const saved of profiles) register(saved)
  // The deployment-provided profile is authoritative for its stable identity.
  // Historical explicit routes remain aliases so open tabs recover after a
  // local Host restart changes its ephemeral address.
  const connected = register(connectedProfile)
  async function authenticate(req, res, route, token, options) {
    await route.carrier.login(req, res, token, {
      ...options,
      async onAccepted(cookie) {
        const entries = structuredClone(savedCredentials.entries)
        entries[route.credentialId] = { address: route.profile.address, token, cookie }
        savedCredentials = { version: 2, entries }
        route.credential = entries[route.credentialId]
        await onCredentials?.(savedCredentials)
      },
    })
  }
  async function control(req, res, route) {
    if (!trusted(req) || !req.headers.origin) { res.writeHead(403).end(); return }
    if (!['POST', 'DELETE'].includes(req.method)) { res.writeHead(405, { allow: 'POST, DELETE' }).end(); return }
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
        if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST' }).end(); return }
        const supplied = typeof value.token === 'string' && value.token.length > 0
        if (value.token !== undefined && (!supplied || value.token.length > 4096) || Object.keys(value).some(key => key !== 'token')) throw Error('Invalid login token')
        const token = supplied ? value.token : route.credential?.token
        if (!token) { res.writeHead(404, { 'cache-control': 'no-store' }).end(); return }
        await authenticate(req, res, route, token)
        return
      }
      if (req.method === 'DELETE') {
        const removed = validateConnectionProfile(value)
        const key = JSON.stringify([removed.id, removed.authenticationViewId])
        const activeKey = JSON.stringify([route.profile.id, route.profile.authenticationViewId])
        if (key === activeKey) { res.writeHead(409, { 'cache-control': 'no-store' }).end(); return }
        const target = current.get(key)
        if (target) {
          routes.delete(target.id)
          current.delete(key)
          for (const [alias, value] of aliases) if (value === target || alias === target.id) aliases.delete(alias)
          target.carrier.close()
        }
        const entries = structuredClone(savedCredentials.entries)
        delete entries[digest(JSON.stringify([removed.id, removed.authenticationViewId]))]
        savedCredentials = { version: 2, entries }
        await onCredentials?.(savedCredentials)
        await onRegister?.([...routes.values()].map(route => route.profile))
        res.writeHead(204, { 'cache-control': 'no-store' }).end()
        return
      }
      const next = register(value)
      await onRegister?.([...routes.values()].map(route => route.profile))
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        .end(JSON.stringify({ url: next.prefix + '/', profile: next.profile }))
    } catch (error) {
      if (!res.headersSent) res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end(error instanceof Error ? error.message : 'Invalid request')
    }
  }
  return {
    connected,
    resolve(req) {
      const path = new URL(req.url, 'http://localhost').pathname
      if (!path.startsWith('/mygo-instance/')) {
        // The presentation shell and its local control/static endpoints use the
        // connected route as context. Remote DSH paths must always name an
        // instance; silently sending /api or a socket to an implicit Host would
        // merge unrelated profiles and make a mygo address alias that Host.
        return path === '/' || path === '/index.html' || path.startsWith('/assets/')
          || path.startsWith('/mygo-local/') || path.startsWith('/mygo-boot/') ? connected : undefined
      }
      const match = /^\/mygo-instance\/([a-f0-9]{64})(\/.*)$/.exec(req.url)
      const route = match && (routes.get(match[1]) ?? aliases.get(match[1]))
      if (!route) return undefined
      req.url = match[2]
      return route
    },
    control,
    profiles: () => [...routes.values()].map(route => route.profile),
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
