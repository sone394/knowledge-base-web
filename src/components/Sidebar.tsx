import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useAutoExportSettings } from '../hooks/useAutoExport'
import { useNotes, type NoteTreeNode } from '../hooks/useNotes'
import { useNotesByTag } from '../hooks/useNoteTags'
import { useTags } from '../hooks/useTags'
import {
  buildNoteTree,
  computeTreeMoveUpdate,
  findTreeNode,
  type TreeDropPosition,
} from '../hooks/utils/noteTree'
import {
  findJournalFolder,
  findTodayJournalId,
  JOURNAL_FOLDER_TITLE,
} from '../lib/journal'
import {
  buildNoteFromTemplate,
  type NoteTemplateId,
} from '../lib/noteTemplates'
import NoteTemplatePicker from './NoteTemplatePicker'
import NoteVirtualTree from './NoteVirtualTree'
import ThemeToggle from './ThemeToggle'

export type SidebarProps = {
  selectedNoteId?: string | null
  onSelectNote: (noteId: string | null) => void
  /** 移动端抽屉模式下关闭侧栏 */
  onClose?: () => void
  /** 是否以抽屉形式展示 */
  isDrawer?: boolean
}

type ContextMenuState = {
  x: number
  y: number
  note: NoteTreeNode
}

const DRAG_MIME = 'application/x-kb-note-id'

function resolveDropPosition(
  event: DragEvent,
  element: HTMLElement,
): TreeDropPosition {
  const rect = element.getBoundingClientRect()
  const offsetY = event.clientY - rect.top
  const ratio = offsetY / rect.height

  if (ratio < 0.25) return 'before'
  if (ratio > 0.75) return 'after'
  return 'child'
}

export default function Sidebar({
  selectedNoteId,
  onSelectNote,
  onClose,
  isDrawer = false,
}: SidebarProps) {
  const location = useLocation()
  const isDashboardActive = location.pathname === '/dashboard'
  const isReviewActive = location.pathname === '/review'
  const isGraphActive = location.pathname === '/graph'
  const isTrashActive = location.pathname === '/trash'
  const { tree, notes, isLoading, isError, createNote, updateNote, deleteNote } =
    useNotes()
  const { tags } = useTags()
  const [tagFilterId, setTagFilterId] = useState<string | null>(null)
  const { notes: tagFilteredNotes, isLoading: isTagFilterLoading } =
    useNotesByTag(tagFilterId ?? undefined)

  const displayTree = useMemo(() => {
    if (!tagFilterId) return tree
    const ids = new Set(tagFilteredNotes.map((note) => note.id))
    return buildNoteTree(notes.filter((note) => ids.has(note.id)))
  }, [tree, tagFilterId, tagFilteredNotes, notes])

  const {
    autoExportEnabled,
    toggleAutoExport,
    handleManualExport,
    isExporting,
    exportError,
  } = useAutoExportSettings()

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<NoteTreeNode | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    id: string
    position: TreeDropPosition
  } | null>(null)
  const [templatePicker, setTemplatePicker] = useState<{
    parentId: string | null
    parentLabel: string | null
  } | null>(null)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const expandFolder = useCallback((folderId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      next.delete(folderId)
      return next
    })
  }, [])

  useEffect(() => {
    if (!contextMenu) return

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) return
      closeContextMenu()
    }
    const handleScroll = () => closeContextMenu()
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, closeContextMenu])

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleContextMenu = (event: MouseEvent, note: NoteTreeNode) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY, note })
  }

  const handleCreateFromTemplate = useCallback(
    (templateId: NoteTemplateId, parentId: string | null) => {
      const { title, content, renameOnCreate } = buildNoteFromTemplate(templateId)
      setTemplatePicker(null)

      createNote.mutate(
        { parent_id: parentId, title, content },
        {
          onSuccess: ({ data: note }) => {
            if (parentId) expandFolder(parentId)
            onSelectNote(note.id)
            if (renameOnCreate) {
              setRenamingId(note.id)
              setRenameValue(note.title || '未命名笔记')
            }
          },
        },
      )
    },
    [createNote, expandFolder, onSelectNote],
  )

  const openTemplatePicker = useCallback(
    (parent: NoteTreeNode | null) => {
      closeContextMenu()
      setTemplatePicker({
        parentId: parent?.id ?? null,
        parentLabel: parent
          ? parent.title.trim() || '未命名笔记'
          : null,
      })
    },
    [closeContextMenu],
  )

  const handleWriteJournal = useCallback(async () => {
    if (createNote.isPending) return

    const folder = findJournalFolder(notes)

    if (folder) {
      const existingId = findTodayJournalId(notes, folder.id)
      if (existingId) {
        expandFolder(folder.id)
        onSelectNote(existingId)
        return
      }

      const { title, content } = buildNoteFromTemplate('daily')
      createNote.mutate(
        { parent_id: folder.id, title, content },
        {
          onSuccess: ({ data: note }) => {
            expandFolder(folder.id)
            onSelectNote(note.id)
          },
        },
      )
      return
    }

    const rootNotes = notes.filter((note) => note.parent_id === null)
    const minSort =
      rootNotes.length > 0
        ? Math.min(...rootNotes.map((note) => note.sort_order))
        : 0

    try {
      const { data: newFolder } = await createNote.mutateAsync({
        parent_id: null,
        title: JOURNAL_FOLDER_TITLE,
        content: '',
        sort_order: minSort - 1,
      })

      const { title, content } = buildNoteFromTemplate('daily')
      createNote.mutate(
        { parent_id: newFolder.id, title, content },
        {
          onSuccess: ({ data: note }) => {
            expandFolder(newFolder.id)
            onSelectNote(note.id)
          },
        },
      )
    } catch {
      // createNote mutation 会通过 isError 反馈
    }
  }, [createNote, expandFolder, notes, onSelectNote])

  const handleStartRename = (note: NoteTreeNode) => {
    closeContextMenu()
    setRenamingId(note.id)
    setRenameValue(note.title.trim() || '未命名笔记')
  }

  const handleRenameSubmit = (noteId: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenamingId(null)
      return
    }

    const note = findTreeNode(tree, noteId)
    if (note && trimmed !== (note.title.trim() || '未命名笔记')) {
      updateNote.mutate({ id: noteId, title: trimmed })
    }
    setRenamingId(null)
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
  }

  const handleRequestDelete = (note: NoteTreeNode) => {
    closeContextMenu()
    setDeleteError(null)
    setDeleteTarget(note)
  }

  const handlePinNote = (note: NoteTreeNode) => {
    const siblings = notes.filter(
      (item) => item.parent_id === note.parent_id && item.id !== note.id,
    )
    const minSort =
      siblings.length > 0
        ? Math.min(...siblings.map((item) => item.sort_order))
        : note.sort_order
    updateNote.mutate({ id: note.id, sort_order: minSort - 1 })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return

    const deletedId = deleteTarget.id
    setDeleteError(null)
    deleteNote.mutate(deletedId, {
      onSuccess: ({ offline, purgedLocalOnly, foreignAccount }) => {
        if (selectedNoteId === deletedId) {
          onSelectNote(null)
        }
        setDeleteTarget(null)
        setDeleteError(null)
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
  }

  const handleDragStart = (event: DragEvent, noteId: string) => {
    event.dataTransfer.setData(DRAG_MIME, noteId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingId(noteId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTarget(null)
  }

  const handleDragOver = (event: DragEvent, noteId: string) => {
    const dragId = event.dataTransfer.getData(DRAG_MIME) || draggingId
    if (!dragId || dragId === noteId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const position = resolveDropPosition(
      event,
      event.currentTarget as HTMLElement,
    )

    setDropTarget((prev) =>
      prev?.id === noteId && prev.position === position
        ? prev
        : { id: noteId, position },
    )
  }

  const handleDragLeave = (noteId: string) => {
    setDropTarget((prev) => (prev?.id === noteId ? null : prev))
  }

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault()

    const dragId = event.dataTransfer.getData(DRAG_MIME) || draggingId
    if (!dragId) return

    const position = resolveDropPosition(
      event,
      event.currentTarget as HTMLElement,
    )

    const moveUpdate = computeTreeMoveUpdate(notes, dragId, targetId, position)
    if (moveUpdate) {
      updateNote.mutate(moveUpdate)
    }

    setDraggingId(null)
    setDropTarget(null)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchQuery('')
    }
  }

  const isEmpty = !isLoading && notes.length === 0
  const isTagFilterEmpty =
    !!tagFilterId && !isTagFilterLoading && tagFilteredNotes.length === 0

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      active
        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
    }`

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
          笔记目录
        </h2>
        <div className="flex items-center gap-1">
          {!isEmpty && (
            <>
              <button
                type="button"
                onClick={() => void handleWriteJournal()}
                disabled={createNote.isPending}
                className="touch-target rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="写日记"
                aria-label="写日记"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => openTemplatePicker(null)}
                disabled={createNote.isPending}
                className="touch-target rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="新建笔记"
                aria-label="新建笔记"
              >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
              </button>
            </>
          )}
          {isDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="touch-target rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="关闭侧栏"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!isEmpty && (
        <div className="space-y-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="筛选笔记标题…"
            aria-label="筛选笔记"
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm md:py-1.5 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:bg-gray-800 dark:focus:ring-blue-900/40"
          />
          <button
            type="button"
            onClick={() => void handleWriteJournal()}
            disabled={createNote.isPending}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            写日记
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading && (
          <div className="space-y-2 px-2 py-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
                style={{ marginLeft: `${(i - 1) * 12}px` }}
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="px-3 py-4 text-sm text-red-600 dark:text-red-400">
            加载笔记失败，请检查网络后重试
          </p>
        )}

        {isEmpty && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">还没有笔记</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleWriteJournal()}
                disabled={createNote.isPending}
                className="touch-target rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
              >
                {createNote.isPending ? '创建中…' : '写日记'}
              </button>
              <button
                type="button"
                onClick={() => openTemplatePicker(null)}
                disabled={createNote.isPending}
                className="touch-target rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                新建笔记
              </button>
            </div>
          </div>
        )}

        {!isEmpty && tags.length > 0 && (
          <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                按标签筛选
              </span>
              {tagFilterId && (
                <button
                  type="button"
                  onClick={() => setTagFilterId(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  清除
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setTagFilterId((prev) => (prev === tag.id ? null : tag.id))
                  }
                  className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                    tagFilterId === tag.id
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTagFilterLoading && tagFilterId && (
          <p className="px-3 py-4 text-sm text-gray-400">加载标签笔记…</p>
        )}

        {isTagFilterEmpty && (
          <p className="px-3 py-4 text-sm text-gray-400">该标签下暂无笔记</p>
        )}

        {!isLoading && !isError && displayTree.length > 0 && (
          <NoteVirtualTree
            tree={displayTree}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            collapsedIds={collapsedIds}
            renamingId={renamingId}
            renameValue={renameValue}
            draggingId={draggingId}
            dropTarget={dropTarget}
            onToggleCollapse={handleToggleCollapse}
            onSelectNote={onSelectNote}
            onContextMenu={handleContextMenu}
            onRenameChange={setRenameValue}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onScroll={closeContextMenu}
            onPinNote={handlePinNote}
            onDeleteNote={handleRequestDelete}
          />
        )}
      </div>

      <div className={`shrink-0 space-y-1 border-t border-gray-200 p-2 dark:border-gray-800 ${isDrawer ? 'hidden' : ''}`}>
        <ThemeToggle />

        <Link to="/trash" className={`touch-target ${navLinkClass(isTrashActive)}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          回收站
        </Link>

        <Link to="/dashboard" className={`touch-target ${navLinkClass(isDashboardActive)}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          仪表盘
        </Link>

        <Link to="/review" className={`touch-target ${navLinkClass(isReviewActive)}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          今日复习
        </Link>

        <Link to="/graph" className={`touch-target ${navLinkClass(isGraphActive)}`}>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path strokeLinecap="round" d="M8.2 16.8l7.6-7.6M8.2 7.2l3 3M16.8 16.8l-3-3" />
          </svg>
          图谱
        </Link>

        <button
          type="button"
          onClick={() => void handleManualExport()}
          disabled={isExporting || isLoading}
          className="touch-target flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V3m0 13.5l4-4m-4 4l-4-4M4.5 19.5h15"
            />
          </svg>
          {isExporting ? '导出中…' : '手动导出'}
        </button>

        <label className="touch-target flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50">
          <span>每 24 小时自动导出</span>
          <input
            type="checkbox"
            checked={autoExportEnabled}
            onChange={(event) => toggleAutoExport(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
        </label>

        {exportError && (
          <p className="px-3 text-xs text-red-500 dark:text-red-400">{exportError}</p>
        )}
      </div>

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[100] min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="touch-target flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => openTemplatePicker(contextMenu.note)}
            >
              新建子笔记
            </button>
            <button
              type="button"
              className="touch-target flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              onClick={() => handleStartRename(contextMenu.note)}
            >
              重命名
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
            <button
              type="button"
              className="touch-target flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => handleRequestDelete(contextMenu.note)}
            >
              删除
            </button>
          </div>,
          document.body,
        )}

      {templatePicker && (
        <NoteTemplatePicker
          open
          parentLabel={templatePicker.parentLabel}
          onClose={() => setTemplatePicker(null)}
          onSelect={(templateId) =>
            handleCreateFromTemplate(templateId, templatePicker.parentId)
          }
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:border dark:border-gray-700 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <h3
              id="delete-dialog-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              确认删除
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              确定要删除「
              {deleteTarget.title.trim() || '未命名笔记'}
              」吗？其子笔记也会一并移入回收站。
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError(null)
                }}
                disabled={deleteNote.isPending}
                className="touch-target rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteNote.isPending}
                className="touch-target rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteNote.isPending ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
