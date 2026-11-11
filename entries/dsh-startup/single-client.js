import { startClient } from './client-base.js'
import { createWebPlatform } from './web-platform.js'

export async function startSingleClient() {
  const container = document.getElementById('root')
  if (!container) throw Error('mygo client: missing #root')
  return startClient({
    ...createWebPlatform(), container,
    async readConfiguration() {
      const response = await fetch('/mygo-local/startup.json', { cache: 'no-store' })
      if (!response.ok) throw Error(`Local startup configuration HTTP ${response.status}`)
      return response.json()
    },
    importLocal(name) {
      const url = new URL(name, new URL('/mygo-local/', location.href)).href
      return import(/* @vite-ignore */ url)
    },
  })
}
