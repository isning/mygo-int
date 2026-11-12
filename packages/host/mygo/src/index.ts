import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { installConnection } from './connection.ts'

export { INDEX_INJECTIONS_PATH } from './connection.ts'

export const name = 'mygo-host'
export const inject = ['webServer', 'connection']

/** Install the Host-side components used by mygo clients. */
export function apply(ctx: Context): void {
  installConnection(ctx)
}
