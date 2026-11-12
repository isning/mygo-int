import { isLocaleSnapshot } from '../locale-settings.js'

/**
 * Create the DSH ConfigForm face backed by MyGO locale settings.
 * @returns MyGO locale preference form.
 */
export function createLocaleForm() {
  let snapshot = { status: 'loading', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false }
  const listeners = new Set()
  const publish = value => {
    snapshot = value
    for (const listener of listeners) listener()
  }
  const request = async (method = 'GET', body) => {
    const response = await fetch('/mygo-local/locale', {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (![200, 409].includes(response.status)) throw Error(`locale settings HTTP ${response.status}`)
    return { status: response.status, value: await response.json() }
  }
  const accept = value => {
    if (!isLocaleSnapshot(value)) throw Error('Invalid locale settings response')
    publish({
      status: 'ready', value: value.preference === null ? {} : { preference: value.preference },
      base: {}, user: value.preference === null ? {} : { preference: value.preference },
      revision: value.revision, writable: true,
    })
  }
  const loaded = request().then(({ value }) => { accept(value) }).catch(() => {
    publish({ ...snapshot, status: 'unavailable' })
  })
  let tail = loaded
  let writeGeneration = 0
  let pendingRevision
  const mutate = (ops, expectedRevision) => {
    let accepted = false
    const generation = ++writeGeneration
    const operation = tail.catch(() => {}).then(async () => {
      if (snapshot.status !== 'ready') return
      let preference = snapshot.value?.preference
      for (const op of ops) {
        if (op.path?.length !== 1 || op.path[0] !== 'preference') return
        if (op.op === 'set') preference = op.value
        else if (op.op === 'unset') preference = null
        else return
      }
      const result = await request('PUT', { expectedRevision: expectedRevision ?? pendingRevision ?? snapshot.revision, preference })
      accepted = result.status === 200
      if (generation === writeGeneration) {
        pendingRevision = undefined
        accept(result.value)
      } else if (accepted) {
        pendingRevision = result.value.revision
      }
    })
    tail = operation.catch(() => {})
    return operation.then(() => accepted)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    mutate,
    set(field, value) { return mutate([{ op: 'set', path: [field], value }]) },
    unset(field) { return mutate([{ op: 'unset', path: [field] }]) },
  }
}
