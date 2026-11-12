/** DSH-compatible locale identifier. */
export const LOCALE_ID_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u

/**
 * Validate a persisted or returned locale snapshot.
 * @param {unknown} value Candidate snapshot.
 * @returns {boolean} Whether the value is an exact locale snapshot.
 */
export function isLocaleSnapshot(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['revision', 'preference'].includes(key))
    && Number.isSafeInteger(value.revision) && value.revision >= 0
    && (value.preference === null || typeof value.preference === 'string' && LOCALE_ID_PATTERN.test(value.preference))
}

/**
 * Validate one revision-fenced locale write.
 * @param {unknown} value Candidate write.
 * @returns {boolean} Whether the value contains only the accepted write fields.
 */
export function isLocaleUpdate(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => ['expectedRevision', 'preference'].includes(key))
    && Number.isSafeInteger(value.expectedRevision) && value.expectedRevision >= 0
    && (value.preference === null || typeof value.preference === 'string' && LOCALE_ID_PATTERN.test(value.preference))
}
