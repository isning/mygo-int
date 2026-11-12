/** Build or serve MyGO; serving resolves with a Cordis-compatible disposer. */
export interface MygoRuntimeOptions {
  port?: number
  bindHost?: string
  publicOrigin?: string
  stateDirectory?: string
  startupConfig?: string
}
export function runMygo(command: 'build' | 'serve', options?: MygoRuntimeOptions): Promise<() => Promise<void>>
