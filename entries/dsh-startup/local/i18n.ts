import type { Context } from '@deepseek-ai/cordis'
import { useSyncExternalStore } from 'react'
export interface ClientLocaleService {
  subscribe(listener: () => void): () => void
  getSnapshot(): number
  locale(): { active: string; locales: readonly { id: string; label: string }[] }
  canSelect(): boolean
  text(key: string, params?: Record<string, string | number>): string
  setLocale(id: string): void
}
declare module '@deepseek-ai/cordis' { interface Context { mygoLocale: ClientLocaleService } }
export function useClientText(ctx: Context) {
  const service = ctx.mygoLocale
  useSyncExternalStore(service.subscribe, service.getSnapshot)
  return service.text
}
export function clientError(ctx: Context, reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason)
  return ctx.mygoLocale.text(message)
}
