import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { useAutoExportSettings } from '../hooks/useAutoExport'
import { useNotes } from '../hooks/useNotes'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { isLoading } = useNotes()
  const {
    autoExportEnabled,
    toggleAutoExport,
    handleManualExport,
    isExporting,
    exportError,
  } = useAutoExportSettings()

  const handleSelectNote = (noteId: string | null) => {
    if (noteId) navigate(`/note/${noteId}`)
    else navigate('/notes/edit')
  }

  return (
    <AppLayout
      mobileTitle="设置"
      onSelectNote={handleSelectNote}
    >
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
              账户
            </h2>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              <button
                type="button"
                onClick={() => signOut()}
                className="touch-target mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                退出登录
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
              外观
            </h2>
            <div className="p-2">
              <ThemeToggle />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
              数据
            </h2>
            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={() => void handleManualExport()}
                disabled={isExporting || isLoading}
                className="touch-target flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3m0 13.5l4-4m-4 4l-4-4M4.5 19.5h15" />
                </svg>
                {isExporting ? '导出中…' : '手动导出'}
              </button>

              <label className="touch-target flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800">
                <span>每 24 小时自动导出</span>
                <input
                  type="checkbox"
                  checked={autoExportEnabled}
                  onChange={(event) => toggleAutoExport(event.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>

              {exportError && (
                <p className="px-3 text-xs text-red-500 dark:text-red-400">{exportError}</p>
              )}

              <Link
                to="/trash"
                className="touch-target flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                回收站
              </Link>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  )
}
