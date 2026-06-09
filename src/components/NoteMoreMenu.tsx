import { useCallback, useEffect, useRef, useState } from 'react'
import { useCreateShareLink, useUnshareNote } from '../hooks/useNoteShare'
import { buildShareUrl, copyTextToClipboard } from '../lib/noteShare'

type NoteMoreMenuProps = {
  noteId: string
  title: string
  content: string
  isShared: boolean
  onOpenHistory: () => void
  onDelete?: () => void
}

export default function NoteMoreMenu({
  noteId,
  title,
  content,
  isShared,
  onOpenHistory,
  onDelete,
}: NoteMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const createShareLink = useCreateShareLink()
  const unshareNote = useUnshareNote()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        close()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 2500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const showFeedback = (message: string) => {
    setFeedback(message)
    close()
  }

  const handleCreateShareLink = async () => {
    try {
      await createShareLink.mutateAsync({ noteId, title, content })
      showFeedback('分享链接已复制到剪贴板')
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : '创建分享链接失败',
      )
    }
  }

  const handleCopyShareLink = async () => {
    try {
      await copyTextToClipboard(buildShareUrl(noteId))
      showFeedback('分享链接已复制')
    } catch {
      showFeedback('复制失败，请手动复制链接')
    }
  }

  const handleUnshare = async () => {
    try {
      await unshareNote.mutateAsync(noteId)
      showFeedback('已关闭公开分享')
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : '关闭分享失败')
    }
  }

  const isPending = createShareLink.isPending || unshareNote.isPending

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="touch-target rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
        aria-label="更多操作"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
          更多
        </span>
      </button>

      {feedback && (
        <span
          role="status"
          className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white dark:bg-gray-100 dark:text-gray-900"
        >
          {feedback}
        </span>
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            onClick={() => void handleCreateShareLink()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            创建分享链接
          </button>

          {isShared && (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => void handleCopyShareLink()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
            >
              复制分享链接
            </button>
          )}

          {isShared && (
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => void handleUnshare()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              关闭公开分享
            </button>
          )}

          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              onOpenHistory()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
          >
            历史版本
          </button>

          {onDelete && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close()
                  onDelete()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                删除笔记
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
