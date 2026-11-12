import { randomBytes, timingSafeEqual } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const equal = (left, right) => {
  const a = Buffer.from(left ?? ''), b = Buffer.from(right ?? '')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** One private launch exchange gates every HTTP and WebSocket request to mygo. */
export async function createClientAuth({ stateDirectory, origin }) {
  const launchToken = randomBytes(32).toString('base64url')
  const sessionToken = randomBytes(32).toString('base64url')
  const cookieName = 'mygo-session'
  const launchFile = resolve(stateDirectory, 'client-launch-url')
  await writeFile(launchFile, `${origin}/?mygo-token=${encodeURIComponent(launchToken)}\n`, { mode: 0o600 })
  return {
    launchFile,
    authenticated(request) {
      return (request.headers.cookie ?? '').split(';').some(part => {
        const [name, ...value] = part.trim().split('=')
        return name === cookieName && equal(value.join('='), sessionToken)
      })
    },
    exchange(request, response) {
      if (request.method !== 'GET') return false
      const url = new URL(request.url, 'http://localhost')
      if (!equal(url.searchParams.get('mygo-token'), launchToken)) return false
      url.searchParams.delete('mygo-token')
      const secure = origin.startsWith('https:') ? '; Secure' : ''
      response.writeHead(303, {
        location: url.pathname + url.search,
        'set-cookie': `${cookieName}=${sessionToken}; HttpOnly; SameSite=Strict; Path=/${secure}`,
        'cache-control': 'no-store',
      }).end()
      return true
    },
  }
}
