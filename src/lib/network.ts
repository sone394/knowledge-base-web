export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function shouldQueueOffline(error: unknown): boolean {
  if (!isOnline()) return true
  if (error instanceof TypeError) return true
  if (error instanceof Error && /fetch|network|failed/i.test(error.message)) {
    return true
  }
  return false
}
