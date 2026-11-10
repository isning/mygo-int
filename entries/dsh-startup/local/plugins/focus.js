import { mountShell } from './shell-layout.js'

export default function focusShell(ctx, config) {
  mountShell(ctx, { name: 'focus', label: config.label, rail: false })
}
