import type { Context } from '@deepseek-ai/cordis'
import type { PackageRow } from '@deepseek-ai/dsh-client-ui-plugin-manager/src/client/manager-store.ts'
import type { ConfigPageForm } from '@deepseek-ai/dsh-client-ui-plugin-manager/src/client/slot-contract.ts'

export interface InstanceProfile { id: string; name: string; address: string; authenticationViewId: string }
export interface InstanceSnapshot {
  catalog: InstanceProfile[]
  currentId: string | null
  currentProfile: InstanceProfile | null
  connectionStatus: 'idle' | 'checking' | 'authenticated' | 'unavailable'
  connectionDiagnostic: string
}
export interface InstanceManager {
  snapshot(): InstanceSnapshot
  isCurrentProfile(profile: InstanceProfile): boolean
  refresh(): Promise<void>
  save(profile: InstanceProfile, original?: InstanceProfile | null): Promise<void>
  select(profile: InstanceProfile): Promise<void>
  remove(profile: InstanceProfile): Promise<void>
  subscribe(listener: () => void): () => void
}
export interface ClientComposition {
  rows(): Array<Omit<PackageRow, 'entryId'> & { entryId?: string }>
  status(): { revision: number; busy: boolean; diagnostic: string }
  subscribe(listener: () => void): () => void
  change(id: string, patch: { disabled?: boolean }, revision?: number): Promise<void>
  configForm(id: string): ConfigPageForm | undefined
  reset(): Promise<void>
}
export interface MygoContext extends Context {
  instanceManager: InstanceManager
  clientComposition: ClientComposition
  connection: {
    state: { subscribe(listener: () => void): () => void; getSnapshot(): string | undefined }
    reconnect(): void
  }
  clientHost: { container: Element; configuration: { selectedInstance: InstanceProfile } }
  mygoStartup: {
    admit(): Promise<void>
    ownsEntry(entry: unknown): boolean
    configuration: { selectedInstance: InstanceProfile }
  }
}
