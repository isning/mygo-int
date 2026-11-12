/** The mygo browser application mounted by its standalone executable. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { runMygo } from '../scripts/dsh-startup.mjs'

/** Stable Cordis plugin name. */
export const name = 'mygo-app'

export interface Config {
  readonly port: number
  readonly bindHost: string
  readonly publicOrigin: string
  readonly stateDirectory: string
  readonly startupConfig: string
}

export const Config: z<Config> = z.object({
  port: z.number().step(1).min(1).max(65535).default(4178),
  bindHost: z.string().default('127.0.0.1'),
  publicOrigin: z.string().default(''),
  stateDirectory: z.string().default('.dsh-build/mygo/state'),
  startupConfig: z.string().default('local/single-root.json'),
})

/** Start mygo inside the profile lifecycle and release its listener on disposal. */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(async () => runMygo('serve', config))
}
