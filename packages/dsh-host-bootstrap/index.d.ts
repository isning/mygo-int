import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-connection'

export declare const name: 'mygo-dsh-host-bootstrap'
export declare const inject: string[]
export declare const INDEX_INJECTIONS_PATH: '/mygo/index-injections'
export interface IndexInjectionsResponse {
  schemaVersion: 1
  injections: IndexInjection[]
}
export declare function apply(ctx: Context): void
