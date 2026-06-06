import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTrash } from '../hooks/useTrash'
import { formatSavedTime } from '../lib/markdown'
import type { Note } from '../../types/database'

function TrashItem({
  note,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: {
  note: Note
  onRestore: (id: string) => void
  onPermanentDelete: (note: Note) => void
  isRestoring: boolean
  isDeleting: boolean
}) {
  const title = note.title.trim() || '未命名笔记'
  const isBusy = isRestoring || isDeleting

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:shadow-none">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-1 text-xs text-gray-400">
          删除于 {formatSavedTime(note.deleted_at ?? undefined)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onRestore(note.id)}
          disabled={isBusy}
          className="touch-target rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
        >
          恢复
        </button>
        <button
          type="button"
          onClick={() => onPermanentDelete(note)}
          disabled={isBusy}
          className="touch-target rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          彻底删除
        </button>
      </div>
    </li>
  )
}

export default function TrashPage() {
  const navigate = useNavigate()
  const { notes, isLoading, isError, refetch, restoreNote, permanentDelete } =
    useTrash()
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      if (noteId) navigate(`/note/${noteId}`)
    },
    [navigate],
  )

  const handleRestore = (id: string) => {
    restoreNote.mutate(id)
  }

  const handleConfirmPermanentDelete = () => {
    if (!deleteTarget) return

    permanentDelete.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <AppLayout mobileTitle="回收站" onSelectNote={handleSelectNote}>
      <main className="flex min-h-0 flex-1 flex-col">
        <header className="hidden shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900 md:flex">
          <div>
            <Link
              to="/notes/edit"
              className="text-sm text-gray-500 transition-colors hover:text-gray-800"
            >
              ← 返回笔记
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-gray-900">回收站</h1>
            <p className="text-xs text-gray-400">
              已删除的笔记可恢复；彻底删除后无法找回，历史版本一并清除
            </p>
          </div>

          {!isLoading && !isError && (
            <span className="text-sm text-gray-500">{notes.length} 项</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-gray-200"
                />
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center">
              <p className="text-sm text-red-600">加载回收站失败</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          )}

          {!isLoading && !isError && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">回收站是空的</p>
            </div>
          )}

          {!isLoading && !isError && notes.length > 0 && (
            <ul className="mx-auto max-w-3xl space-y-3">
              {notes.map((note) => (
                <TrashItem
                  key={note.id}
                  note={note}
                  onRestore={handleRestore}
                  onPermanentDelete={setDeleteTarget}
                  isRestoring={restoreNote.isPending}
                  isDeleting={permanentDelete.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-gray-900">彻底删除</h3>
            <p className="mt-2 text-sm text-gray-600">
              确定要彻底删除「
              {deleteTarget.title.trim() || '未命名笔记'}
              」吗？笔记及其所有历史版本将被永久删除，此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={permanentDelete.isPending}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                disabled={permanentDelete.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {permanentDelete.isPending ? '删除中…' : '彻底删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
