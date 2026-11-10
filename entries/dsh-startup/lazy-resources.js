// One pinned original React.lazy entry; no package wildcard or source maps.
export const LAZY_OWNER = '@deepseek-ai/dsh-client-ui-sidebar-terminal'
export const LAZY_FILE = 'client.terminal.js'
export const LAZY_PATH = `/plugins/${LAZY_OWNER}/${LAZY_FILE}`

export function lazyBundleReferences(graph) {
  if (!Array.isArray(graph?.entries)) throw new Error('Missing boot graph entries')
  const rows = graph.entries.filter(row => row.id === LAZY_OWNER)
  if (rows.length !== 1) throw new Error('Expected one terminal chunk owner')
  const row = rows[0]
  if (typeof row.rev !== 'string' || !/^[A-Za-z0-9_-]+$/.test(row.rev) ||
      row.url !== `plugins/??${LAZY_OWNER}/client.js&rev=${row.rev}`) {
    throw new Error('Unsupported terminal owner reference')
  }
  return new Set([`${LAZY_PATH.slice(1)}?rev=${row.rev}`])
}
