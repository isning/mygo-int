// Reuse the existing local anchor without editing shared preparation or upstream sources.
import './dsh-status-live-prepare.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const anchor = resolve('.scratch/status-live/anchor')
const existing = readFileSync(`${anchor}/smoke.mjs`, 'utf8')
const prefix = existing.slice(0, existing.indexOf('try {'))
const up = resolve('.scratch/upstream/deepseek-harness')
const imports = `
import { createRequire } from 'node:module';
import { createAuthenticatedEventsTransport } from ${JSON.stringify(resolve('scripts/dsh-events-transport.mjs'))};
const require = createRequire(${JSON.stringify(up + '/packages/api/gateway/package.json')});
const WebSocket = require('ws');
const {Context} = await import('@deepseek-ai/cordis');
const {installConnection} = await import('@deepseek-ai/dsh-client-connection/client');
const registry = await import(${JSON.stringify(up + '/packages/typert/registry/lib/client.node.js')});
const gateway = await import(${JSON.stringify(up + '/packages/api/gateway/lib/client.node.js')});
`
writeFileSync(`${anchor}/events-smoke.mjs`, prefix + imports + readFileSync(new URL('./dsh-events-live-harness.mjs', import.meta.url), 'utf8'))
