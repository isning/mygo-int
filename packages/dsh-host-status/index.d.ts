import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-client-modules'

export declare const name: 'mygo-dsh-host-status'
export declare const inject: string[]
export declare const STATUS_PATH: '/mygo/status'
export declare const INDEX_INJECTIONS_PATH: '/mygo/index-injections'
export interface IndexInjectionsResponse {
  schemaVersion: 1
  injections: IndexInjection[]
}
export interface StatusResponse {
  schemaVersion: 1
  status: 'adapter-ready'
  adapterVersion: '0.1.0'
  release: { version: string; commit?: string } | null
}
export declare function apply(ctx: Context): void
