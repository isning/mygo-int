export function connectionProfileKey(profile) {
  return JSON.stringify([profile.id, profile.authenticationViewId])
}
