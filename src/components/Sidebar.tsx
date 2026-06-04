import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useNotes, type NoteTreeNode } from '../hooks/useNotes'

export type SidebarProps = {
  selectedNoteId?: string | null
  onSelectNote: (noteId: string | null) => void
}

type ContextMenuState = {
  x: number
  y: number
  note: NoteTreeNode
}

type NoteTreeItemProps = {
  node: NoteTreeNode
  depth: number
  selectedNoteId?: string | null
  collapsedIds: Set<string>
  renamingId: string | null
  renameValue: string
  onToggleCollapse: (id: string) => void
  onSelectNote: (noteId: string) => void
  onContextMenu: (event: MouseEvent, note: NoteTreeNode) => void
  onRenameChange: (value: string) => void
  onRenameSubmit: (noteId: string) => void
  onRenameCancel: () => void
}

function NoteTreeItem({
  node,
  depth,
  selectedNoteId,
  collapsedIds,
  renamingId,
  renameValue,
  onToggleCollapse,
  onSelectNote,
  onContextMenu,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: NoteTreeItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isCollapsed = collapsedIds.has(node.id)
  const isSelected = selectedNoteId === node.id
  const isRenaming = renamingId === node.id
  const displayTitle = node.title.trim() || '未命名笔记'

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isRenaming])

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onRenameSubmit(node.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onRenameCancel()
    }
  }

  return (
    <div>
      <div
        className="group flex items-center rounded-md pr-1 hover:bg-gray-100"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onContextMenu={(event) => onContextMenu(event, node)}
      >
        <button
          type="button"
          aria-label={isCollapsed ? '展开' : '折叠'}
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) onToggleCollapse(node.id)
          }}
          className={`flex h-6 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600 ${
            hasChildren ? 'visible' : 'invisible'
          }`}
        >
          <svg
            viewBox="0 0 16 16"
            className={`h-3 w-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="currentColor"
            aria-hidden
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
        </button>

        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(event) => onRenameChange(event.target.value)}
            onBlur={() => onRenameSubmit(node.id)}
            onKeyDown={handleRenameKeyDown}
            className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelectNote(node.id)}
            className={`min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-sm transition-colors ${
              isSelected
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-gray-700 hover:text-gray-900'
            }`}
            title={displayTitle}
          >
            {displayTitle}
          </button>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div>
          {node.children!.map((child) => (
            <NoteTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNoteId={selectedNoteId}
              collapsedIds={collapsedIds}
              renamingId={renamingId}
              renameValue={renameValue}
              onToggleCollapse={onToggleCollapse}
              onSelectNote={onSelectNote}
              onContextMenu={onContextMenu}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ selectedNoteId, onSelectNote }: SidebarProps) {
  const { tree, isLoading, isError, createNote, updateNote, deleteNote } =
    useNotes()

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<NoteTreeNode | null>(null)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (!contextMenu) return

    const handleClick = () => closeContextMenu()
    const handleScroll = () => closeContextMenu()

    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('contextmenu', handleClick)

    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('contextmenu', handleClick)
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
    setContextMenu({ x: event.clientX, y: event.clientY, note })
  }

  const handleCreateRoot = () => {
    createNote.mutate(
      { parent_id: null, title: '未命名笔记本' },
      {
        onSuccess: (note) => {
          onSelectNote(note.id)
          setRenamingId(note.id)
          setRenameValue(note.title || '未命名笔记本')
        },
      },
    )
  }

  const handleCreateChild = (parent: NoteTreeNode) => {
    closeContextMenu()
    createNote.mutate(
      { parent_id: parent.id, title: '未命名笔记' },
      {
        onSuccess: (note) => {
          setCollapsedIds((prev) => {
            const next = new Set(prev)
            next.delete(parent.id)
            return next
          })
          onSelectNote(note.id)
          setRenamingId(note.id)
          setRenameValue(note.title || '未命名笔记')
        },
      },
    )
  }

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

    const note = findNode(tree, noteId)
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
    setDeleteTarget(note)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return

    const deletedId = deleteTarget.id
    deleteNote.mutate(deletedId, {
      onSuccess: () => {
        if (selectedNoteId === deletedId) {
          onSelectNote(null)
        }
        setDeleteTarget(null)
      },
    })
  }

  const isEmpty = !isLoading && tree.length === 0

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900">
          笔记本
        </h2>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleCreateRoot}
            disabled={createNote.isPending}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            title="新建笔记本"
            aria-label="新建笔记本"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="space-y-2 px-2 py-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-md bg-gray-100"
                style={{ marginLeft: `${(i - 1) * 12}px` }}
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="px-3 py-4 text-sm text-red-600">加载笔记失败，请稍后重试</p>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="mb-4 text-sm text-gray-500">还没有任何笔记</p>
            <button
              type="button"
              onClick={handleCreateRoot}
              disabled={createNote.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createNote.isPending ? '创建中…' : '创建第一本笔记本'}
            </button>
          </div>
        )}

        {!isLoading && !isError && tree.length > 0 && (
          <nav aria-label="笔记目录">
            {tree.map((node) => (
              <NoteTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedNoteId={selectedNoteId}
                collapsedIds={collapsedIds}
                renamingId={renamingId}
                renameValue={renameValue}
                onToggleCollapse={handleToggleCollapse}
                onSelectNote={onSelectNote}
                onContextMenu={handleContextMenu}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={handleRenameCancel}
              />
            ))}
          </nav>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => handleCreateChild(contextMenu.note)}
          >
            新建子笔记
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => handleStartRename(contextMenu.note)}
          >
            重命名
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleRequestDelete(contextMenu.note)}
          >
            删除
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <h3
              id="delete-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              确认删除
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              确定要删除「
              {deleteTarget.title.trim() || '未命名笔记'}
              」吗？其所有子笔记也将一并删除，此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteNote.isPending}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteNote.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteNote.isPending ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function findNode(nodes: NoteTreeNode[], id: string): NoteTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}
