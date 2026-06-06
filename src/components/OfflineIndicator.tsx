import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function OfflineIndicator() {
  const { isOffline, pendingSyncCount } = useNetworkStatus()

  if (!isOffline && pendingSyncCount === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
          isOffline
            ? 'bg-amber-500 text-white'
            : 'bg-blue-600 text-white'
        }`}
      >
        {isOffline ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-white" aria-hidden />
            离线模式
            {pendingSyncCount > 0 && (
              <span className="opacity-90">· {pendingSyncCount} 条待同步</span>
            )}
          </>
        ) : (
          <>
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-white"
              aria-hidden
            />
            正在同步 {pendingSyncCount} 条更改…
          </>
        )}
      </div>
    </div>
  )
}
