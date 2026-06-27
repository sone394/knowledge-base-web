import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { useNoteContent } from '../hooks/useNoteContent'
import { useNotes } from '../hooks/useNotes'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useEditorSession } from '../context/EditorSessionContext'
import {
  formatSavedTime,
  htmlToMarkdown,
  markdownToEditorHtml,
} from '../lib/markdown'
import { countNoteCharacters } from '../lib/noteText'
import { applyFormatPainter, isFormatPainterActive } from '../lib/formatPainter'
import { NoteLinkExtension } from '../lib/tiptap/noteLinkExtension'
import { createEditorExtensions } from '../lib/tiptap/createEditorExtensions'
import AiSummaryPanel from './AiSummaryPanel'
import EditorToolbar from './EditorToolbar'
import NoteHistoryDrawer from './NoteHistoryDrawer'
import NoteTagPanel from './NoteTagPanel'
import NoteRightPanel from './NoteRightPanel'
import NoteReadingView from './NoteReadingView'
import PullToRefresh from './PullToRefresh'
import { useToggleNoteReview } from '../hooks/useReview'
import { formatReviewDueDate } from '../lib/spacedRepetition'
import NoteMoreMenu from './NoteMoreMenu'
export type NoteEditorProps = {
  noteId: string
  onSelectNote: (noteId: string | null) => void
  onFocusModeChange?: (isFocusMode: boolean) => void
}

export default function NoteEditor({
  noteId,
  onSelectNote,
  onFocusModeChange,
}: NoteEditorProps) {
  const {
    note,
    title,
    content,
    setTitle,
    setContent,
    isLoading,
    isSaving,
    isDirty,
    isOfflinePending,
    isError,
    error,
    saveError,
    isGeneratingSummary,
    summaryError,
    regenerateSummary,
    canRegenerateSummary,
    refetch,
    cancelPendingSave,
  } = useNoteContent(noteId)

  const { updateTabTitle, closeTabsForNote } = useEditorSession()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [focusVisible, setFocusVisible] = useState(false)

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev)
  }, [])

  const charCount = useMemo(
    () => countNoteCharacters(title, content),
    [title, content],
  )

  const isMobile = useIsMobile()
  const { notes, refetch: refetchNotes, deleteNote } = useNotes()
  const toggleReview = useToggleNoteReview()
  const notesRef = useRef(notes)
  notesRef.current = notes

  const noteLinkExtension = useMemo(
    () =>
      NoteLinkExtension.configure({
        excludeNoteId: noteId,
        getNotes: () =>
          notesRef.current.map((note) => ({
            id: note.id,
            label: note.title.trim() || '未命名笔记',
          })),
      }),
    [noteId],
  )

  const loadedNoteIdRef = useRef<string | null>(null)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const editor = useEditor(
    {
      extensions: createEditorExtensions({ noteLinkExtension }),
      content: '',
      editorProps: {
        attributes: {
          class:
            'note-editor-content min-h-[calc(100vh-16rem)] max-w-none focus:outline-none',
        },
        handleDOMEvents: {
          mouseup: () => {
            if (editorRef.current && isFormatPainterActive()) {
              applyFormatPainter(editorRef.current)
            }
            return false
          },
        },
      },
      onUpdate: ({ editor: ed }) => {
        setContent(htmlToMarkdown(ed.getHTML()))
      },
    },
    [noteId, noteLinkExtension],
  )

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    updateTabTitle(noteId, title)
  }, [noteId, title, updateTabTitle])

  useEffect(() => {
    onFocusModeChange?.(isFocusMode)
  }, [isFocusMode, onFocusModeChange])

  useEffect(() => {
    if (isFocusMode) {
      const frame = requestAnimationFrame(() => setFocusVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setFocusVisible(false)
  }, [isFocusMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        toggleFocusMode()
        return
      }

      if (event.key === 'Escape' && isFocusMode) {
        event.preventDefault()
        setIsFocusMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocusMode, toggleFocusMode])

  useEffect(() => {
    loadedNoteIdRef.current = null
  }, [noteId])

  useEffect(() => {
    if (!editor || !note || isLoading) return
    if (loadedNoteIdRef.current === noteId) return

    editor.commands.setContent(markdownToEditorHtml(note.content), {
      emitUpdate: false,
    })
    loadedNoteIdRef.current = noteId
  }, [editor, note, noteId, isLoading])

  useEffect(() => {
    if (!editor) return

    editor.setOptions({
      editorProps: {
        attributes: {
          class: isFocusMode
            ? 'note-editor-content min-h-[36vh] max-w-none focus:outline-none'
            : 'note-editor-content min-h-[calc(100vh-16rem)] max-w-none focus:outline-none',
        },
      },
    })
  }, [editor, isFocusMode])

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchNotes()])
  }, [refetch, refetchNotes])

  const saveStatus = isSaving
    ? '保存中…'
    : isDirty
      ? '有未保存的更改'
      : isOfflinePending
        ? '已离线保存，待同步'
        : `最后保存：${formatSavedTime(note?.updated_at)}`

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl space-y-4 px-8">
          <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          加载笔记失败：{error instanceof Error ? error.message : '请稍后重试'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="touch-target rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          重试
        </button>
      </div>
    )
  }

  const readingModeButton = (
    <button
      type="button"
      onClick={() => setIsReadingMode((prev) => !prev)}
      className={`touch-target rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
        isReadingMode
          ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
      title={isReadingMode ? '退出阅读模式' : '阅读模式'}
      aria-label={isReadingMode ? '退出阅读模式' : '进入阅读模式'}
    >
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        {isReadingMode ? '编辑' : '阅读'}
      </span>
    </button>
  )

  const focusToggleButton = (
    <button
      type="button"
      onClick={toggleFocusMode}
      className="touch-target rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
      title={isFocusMode ? '退出专注模式 (Esc)' : '专注模式 (Ctrl+Shift+F)'}
      aria-label={isFocusMode ? '退出专注模式' : '进入专注模式'}
    >
      {isFocusMode ? (
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          退出专注
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
          </svg>
          专注模式
        </span>
      )}
    </button>
  )

  const needsReview = note?.needs_review ?? false
  const isShared = note?.is_shared ?? false

  const moreMenu = (
    <NoteMoreMenu
      noteId={noteId}
      title={title}
      content={content}
      isShared={isShared}
      onOpenHistory={() => setHistoryOpen(true)}
      onDelete={() => setDeleteConfirmOpen(true)}
    />
  )

  const reviewToggle = (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs transition-colors hover:border-amber-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-600">
      <input
        type="checkbox"
        checked={needsReview}
        disabled={toggleReview.isPending}
        onChange={(event) => {
          toggleReview.mutate({ noteId, enabled: event.target.checked })
        }}
        className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600"
      />
      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        需要复习
      </span>
      {needsReview && note?.next_review_date && (
        <span className="text-gray-400 dark:text-gray-500">
          · {formatReviewDueDate(note.next_review_date)}
        </span>
      )}
    </label>
  )

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-opacity duration-300 ease-in-out lg:flex-row ${
        isFocusMode
          ? `fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 ${
              focusVisible ? 'opacity-100' : 'opacity-0'
            }`
          : 'opacity-100'
      }`}
    >
      <div
        className={`flex min-w-0 flex-1 flex-col ${
          isFocusMode ? 'justify-center' : ''
        }`}
      >
        {isMobile && !isFocusMode ? (
          <PullToRefresh
            onRefresh={handlePullRefresh}
            disabled={isDirty || isSaving}
            className="relative"
          >
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              {reviewToggle}
              {readingModeButton}
              {moreMenu}
              {focusToggleButton}
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 py-6">
              {!isReadingMode && (
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="无标题"
                  className="mb-4 w-full border-none bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-gray-600"
                />
              )}
              {!isReadingMode && (
                <EditorToolbar editor={editor} onFocusMode={toggleFocusMode} />
              )}
              {isReadingMode ? (
                <NoteReadingView title={title} content={content} />
              ) : editor ? (
                <EditorContent editor={editor} />
              ) : null}
            </div>
          </PullToRefresh>
        ) : (
          <div
            className={`relative flex-1 overflow-y-auto ${
              isFocusMode ? 'flex items-center' : ''
            }`}
          >
            <div
              className={`absolute right-6 top-4 z-10 flex items-center gap-2 transition-opacity duration-300 ${
                isFocusMode ? 'top-6' : ''
              }`}
            >
              {!isFocusMode && reviewToggle}
              {!isFocusMode && readingModeButton}
              {!isFocusMode && moreMenu}
              {focusToggleButton}
            </div>

            <div
              className={`mx-auto w-full max-w-3xl px-8 ${
                isFocusMode ? 'py-10' : 'py-8'
              }`}
            >
              {!isReadingMode && (
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="无标题"
                  className="mb-4 w-full border-none bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-gray-600"
                />
              )}

              {!isFocusMode && !isReadingMode && (
                <EditorToolbar editor={editor} onFocusMode={toggleFocusMode} />
              )}
              {isReadingMode ? (
                <NoteReadingView title={title} content={content} />
              ) : editor ? (
                <EditorContent editor={editor} />
              ) : null}
            </div>
          </div>
        )}

        {!isFocusMode && (
          <AiSummaryPanel
            summary={note?.summary}
            isGenerating={isGeneratingSummary}
            canGenerate={canRegenerateSummary}
            error={summaryError}
            onGenerate={regenerateSummary}
          />
        )}

        <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-2.5 transition-opacity duration-300 dark:border-gray-800 dark:bg-gray-900 md:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-500">
            {isFocusMode ? (
              <>
                <span className="tabular-nums text-gray-500 dark:text-gray-400">
                  {charCount} 字
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  按 Esc 或 Ctrl+Shift+F 退出专注模式
                </span>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <span>{saveStatus}</span>
                  {saveError && (
                    <p className="mt-0.5 text-red-500" role="alert">
                      保存失败：{saveError instanceof Error ? saveError.message : '请稍后重试'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-gray-400 dark:text-gray-500">
                    {charCount} 字
                  </span>
                  {isShared && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      已分享
                    </span>
                  )}
                  <span className="hidden text-gray-300 sm:inline dark:text-gray-600">
                    Markdown 快捷键：# 标题 · [[ 链接笔记 · - 列表
                  </span>
                </div>
              </>
            )}
          </div>
        </footer>
      </div>

      <NoteHistoryDrawer
        noteId={noteId}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestored={() => {
          loadedNoteIdRef.current = null
          void refetch()
        }}
      />

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:border dark:border-gray-700 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-delete-dialog-title"
          >
            <h3
              id="editor-delete-dialog-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              确认删除
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              确定要删除「{title.trim() || '未命名笔记'}」吗？其子笔记也会一并移入回收站。
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setDeleteError(null)
                }}
                disabled={deleteNote.isPending}
                className="touch-target rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null)
                  cancelPendingSave()
                  deleteNote.mutate(noteId, {
                    onSuccess: ({ offline, purgedLocalOnly, foreignAccount }) => {
                      setDeleteConfirmOpen(false)
                      setDeleteError(null)
                      const nextNoteId = closeTabsForNote(noteId)
                      onSelectNote(nextNoteId)
                      if (foreignAccount) {
                        window.alert(
                          '该笔记属于其他登录账号，已从当前列表移除。如需彻底删除，请用创建它的账号登录。',
                        )
                      } else if (purgedLocalOnly) {
                        window.alert('该笔记未同步到云端，已从本地列表移除。')
                      } else if (offline) {
                        window.alert('当前网络不稳定，删除已暂存本地，联网后将同步到回收站。')
                      }
                    },
                    onError: (err) => {
                      setDeleteError(
                        err instanceof Error ? err.message : '删除失败，请稍后重试',
                      )
                    },
                  })
                }}
                disabled={deleteNote.isPending}
                className="touch-target rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteNote.isPending ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isFocusMode && (
        <div className="transition-opacity duration-300 ease-in-out">
          <NoteTagPanel noteId={noteId} />
          <NoteRightPanel
            noteId={noteId}
            title={title}
            content={content}
            onSelectNote={onSelectNote}
          />
        </div>
      )}
    </div>
  )
}
