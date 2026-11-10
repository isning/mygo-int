// Explicit browser capability origins. Upstream credentials never enter this policy.
export function createCarrierTrust({ publicOrigins = [] } = {}) {
  const origins = publicOrigins.map(value => {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw Error('Public origins must be exact HTTP(S) origins without paths')
    }
    return url
  })
  return (request, socket = false) => {
    const allowed = [new URL('http://127.0.0.1:' + request.socket.localPort), ...origins]
    const origin = allowed.find(url => url.host === request.headers.host)
    return Boolean(origin &&
      ((!socket && !request.headers.origin) || request.headers.origin === origin.origin) &&
      (!request.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(request.headers['sec-fetch-site'])))
  }
}
