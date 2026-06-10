export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** 防止 Supabase 等请求在弱网下无限挂起 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = '请求超时',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)

    Promise.resolve(promise)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer))
  })
}

export function shouldQueueOffline(error: unknown): boolean {
  if (!isOnline()) return true
  if (error instanceof TypeError) return true
  if (error instanceof Error && /fetch|network|failed/i.test(error.message)) {
    return true
  }
  return false
}
