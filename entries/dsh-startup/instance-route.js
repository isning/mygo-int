// Every tab carries an explicit route. No mutable global server selection/cookie.
export function routeURL(value, page = globalThis.location) {
  const prefix = /^\/mygo-instance\/[a-f0-9]{64}(?=\/)/.exec(page.pathname)?.[0]
  const url = new URL(value, page.href)
  if (!prefix || !['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)
    || url.host !== page.host || url.pathname.startsWith('/mygo-instance/')) return url.href
  url.pathname = prefix + url.pathname
  return url.href
}

export function installInstanceRoute() {
  if (!location.pathname.startsWith('/mygo-instance/')) return
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => {
    if (input instanceof Request) return originalFetch(new Request(routeURL(input.url), input), init)
    return originalFetch(routeURL(String(input)), init)
  }
  const Socket = globalThis.WebSocket
  globalThis.WebSocket = class extends Socket {
    constructor(url, protocols) { super(routeURL(String(url)), protocols) }
  }
  if (globalThis.EventSource) {
    const Source = globalThis.EventSource
    globalThis.EventSource = class extends Source {
      constructor(url, options) { super(routeURL(String(url)), options) }
    }
  }
  globalThis.__DSH_TRANSPORT__ = {
    ...globalThis.__DSH_TRANSPORT__,
    resolveAsset: reference => routeURL(reference),
    loadBundle: url => new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = routeURL(url)
      script.onload = () => { script.remove(); resolve() }
      script.onerror = () => { script.remove(); reject(Error('Instance bundle could not be loaded')) }
      document.head.append(script)
    }),
  }
}

export function partitionRemoteStorage(storage, identity) {
  const prefix = 'mygo.remote.v1:' + JSON.stringify(identity) + ':'
  const keys = () => Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(key => key?.startsWith(prefix))
  const methods = {
    get length() { return keys().length },
    key(index) { return keys()[index]?.slice(prefix.length) ?? null },
    getItem(key) { return storage.getItem(prefix + key) },
    setItem(key, value) { storage.setItem(prefix + key, value) },
    removeItem(key) { storage.removeItem(prefix + key) },
    clear() { for (const key of keys()) storage.removeItem(key) },
  }
  if (globalThis.Storage) Object.setPrototypeOf(methods, globalThis.Storage.prototype)
  return new Proxy(methods, {
    get(target, key) { return key in target || typeof key !== 'string' ? target[key] : target.getItem(key) ?? undefined },
    set(target, key, value) { if (typeof key !== 'string' || key in target) return false; target.setItem(key, value); return true },
    deleteProperty(target, key) { if (typeof key === 'string') target.removeItem(key); return true },
    ownKeys() { return keys().map(key => key.slice(prefix.length)) },
    getOwnPropertyDescriptor(target, key) {
      if (typeof key === 'string' && target.getItem(key) !== null) return { configurable: true, enumerable: true, writable: true, value: target.getItem(key) }
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })
}
