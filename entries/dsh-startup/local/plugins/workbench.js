import { mountShell } from './shell-layout.js'

export default function workbenchShell(ctx, config) {
  mountShell(ctx, { name: 'workbench', label: config.label, rail: true })
}
