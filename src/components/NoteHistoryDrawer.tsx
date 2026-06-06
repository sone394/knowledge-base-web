import { useState } from 'react'
import { useNoteHistory } from '../hooks/useNoteHistory'
import { formatSavedTime } from '../lib/markdown'
import type { NoteHistory } from '../../types/database'

type NoteHistoryDrawerProps = {
  noteId: string
  open: boolean
  onClose: () => void
  onRestored?: () => void
}

function HistoryPreview({
  version,
  onRestore,
  isRestoring,
}: {
  version: NoteHistory
  onRestore: () => void
  isRestoring: boolean
}) {
  const title = version.title?.trim() || '未命名笔记'
  const content = version.content?.trim() || '（空内容）'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-400">
          保存于 {formatSavedTime(version.created_at)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
          {content}
        </pre>
      </div>

      <div className="border-t border-gray-200 px-5 py-4">
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRestoring ? '恢复中…' : '恢复此版本'}
        </button>
      </div>
    </div>
  )
}

export default function NoteHistoryDrawer({
  noteId,
  open,
  onClose,
  onRestored,
}: NoteHistoryDrawerProps) {
  const { history, isLoading, isError, restoreVersion } = useNoteHistory(
    open ? noteId : undefined,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedVersion =
    history.find((item) => item.id === selectedId) ?? history[0] ?? null

  const handleRestore = () => {
    if (!selectedVersion) return

    restoreVersion.mutate(selectedVersion.id, {
      onSuccess: () => {
        onRestored?.()
        onClose()
      },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="关闭历史版本"
        onClick={onClose}
      />

      <aside
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2
              id="history-drawer-title"
              className="text-base font-semibold text-gray-900"
            >
              历史版本
            </h2>
            <p className="text-xs text-gray-400">每次保存前会自动记录一个版本</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="关闭"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
            </svg>
          </button>
        </header>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            加载历史版本…
          </div>
        )}

        {isError && (
          <div className="flex flex-1 items-center justify-center text-sm text-red-500">
            加载失败，请稍后重试
          </div>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-400">
            暂无历史版本。编辑并保存笔记后会自动记录。
          </div>
        )}

        {!isLoading && !isError && history.length > 0 && (
          <div className="flex min-h-0 flex-1">
            <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50">
              <ul className="p-2">
                {history.map((item, index) => {
                  const isSelected = selectedVersion?.id === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-white shadow-sm ring-1 ring-blue-200'
                            : 'hover:bg-white/80'
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-800">
                          {index === 0 ? '当前保存前' : `版本 ${history.length - index}`}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatSavedTime(item.created_at)}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {selectedVersion && (
              <div className="min-w-0 flex-1">
                <HistoryPreview
                  version={selectedVersion}
                  onRestore={handleRestore}
                  isRestoring={restoreVersion.isPending}
                />
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
