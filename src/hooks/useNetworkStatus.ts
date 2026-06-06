import { useEffect, useState } from 'react'
import { getPendingCount } from '../lib/outbox'
import { OUTBOX_CHANGE_EVENT } from '../lib/syncConstants'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  )
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  useEffect(() => {
    const updateOnline = () => {
      setIsOnline(navigator.onLine)
    }

    const updatePending = (event?: Event) => {
      const custom = event as CustomEvent<{ pending: number }> | undefined
      if (custom?.detail?.pending !== undefined) {
        setPendingSyncCount(custom.detail.pending)
        return
      }
      void getPendingCount().then(setPendingSyncCount)
    }

    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    window.addEventListener(OUTBOX_CHANGE_EVENT, updatePending)

    updatePending()

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      window.removeEventListener(OUTBOX_CHANGE_EVENT, updatePending)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    pendingSyncCount,
    isSyncing: pendingSyncCount > 0,
  }
}
