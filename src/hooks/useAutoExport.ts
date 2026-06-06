import { useCallback, useEffect, useState } from 'react'
import { useEncryption } from '../context/EncryptionContext'
import {
  AUTO_EXPORT_CHECK_MS,
  exportAllNotes,
  isAutoExportEnabled,
  runAutoExportIfDue,
  setAutoExportEnabled,
  setLastExportAt,
} from '../lib/export'

export function useAutoExportSettings() {
  const { password } = useEncryption()
  const [enabled, setEnabled] = useState(isAutoExportEnabled)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const toggleAutoExport = useCallback((value: boolean) => {
    setAutoExportEnabled(value)
    setEnabled(value)
  }, [])

  const handleManualExport = useCallback(async () => {
    if (!password) {
      setExportError('请先解锁知识库')
      return
    }

    setIsExporting(true)
    setExportError(null)

    try {
      await exportAllNotes(password)
      setLastExportAt()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [password])

  return {
    autoExportEnabled: enabled,
    toggleAutoExport,
    handleManualExport,
    isExporting,
    exportError,
  }
}

/** 在应用根节点挂载，负责定时与页面关闭时的自动导出 */
export function useAutoExportWatcher() {
  const { password, isUnlocked } = useEncryption()

  useEffect(() => {
    if (!isUnlocked || !password) return

    void runAutoExportIfDue(password)

    const intervalId = window.setInterval(() => {
      void runAutoExportIfDue(password)
    }, AUTO_EXPORT_CHECK_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void runAutoExportIfDue(password)
      }
    }

    const onPageHide = () => {
      void runAutoExportIfDue(password)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [password, isUnlocked])
}
