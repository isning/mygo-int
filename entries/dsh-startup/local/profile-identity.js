export function instanceAccessKey(profile) {
  return JSON.stringify([profile.id, profile.authenticationViewId])
}

export function normalizeConnectionProfile(profile) {
  if (!profile || !/^[\w-]{1,128}$/.test(profile.id) || typeof profile.name !== 'string' || !profile.name.trim()
    || profile.name.length > 128 || !/^[\w-]{1,128}$/.test(profile.authenticationViewId)) {
    throw Error('Expected stable id, name and authentication view')
  }
  if (Object.keys(profile).some(key => !['id', 'name', 'address', 'authenticationViewId'].includes(key))) {
    throw Error('Credentials and unknown catalog fields are not accepted')
  }
  let address
  try { address = new URL(profile.address) } catch { throw Error('Invalid URL') }
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password || address.search || address.hash || address.pathname !== '/') {
    throw Error('Use an HTTP(S) origin without credentials, path or token')
  }
  return { id: profile.id, name: profile.name.trim(), address: address.origin, authenticationViewId: profile.authenticationViewId }
}
