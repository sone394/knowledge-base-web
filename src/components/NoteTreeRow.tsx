import {
  useEffect,
  useRef,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { NoteTreeNode } from '../hooks/useNotes'
import type { TreeDropPosition } from '../hooks/utils/noteTree'
import { TREE_INDENT_PX } from '../hooks/utils/noteTree'
import HighlightedText from './HighlightedText'

export type NoteTreeRowProps = {
  node: NoteTreeNode
  depth: number
  hasChildren: boolean
  isCollapsed: boolean
  isSelected: boolean
  isRenaming: boolean
  renameValue: string
  searchQuery: string
  isDragging: boolean
  dropHint: TreeDropPosition | null
  onToggleCollapse: (id: string) => void
  onSelectNote: (noteId: string) => void
  onContextMenu: (event: MouseEvent, note: NoteTreeNode) => void
  onRenameChange: (value: string) => void
  onRenameSubmit: (noteId: string) => void
  onRenameCancel: () => void
  onDragStart: (event: DragEvent, noteId: string) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent, noteId: string) => void
  onDragLeave: (noteId: string) => void
  onDrop: (event: DragEvent, noteId: string) => void
}

export default function NoteTreeRow({
  node,
  depth,
  hasChildren,
  isCollapsed,
  isSelected,
  isRenaming,
  renameValue,
  searchQuery,
  isDragging,
  dropHint,
  onToggleCollapse,
  onSelectNote,
  onContextMenu,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: NoteTreeRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
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

  const dropClass =
    dropHint === 'before'
        ? 'border-t-2 border-blue-400 dark:border-blue-500'
      : dropHint === 'after'
        ? 'border-b-2 border-blue-400 dark:border-blue-500'
        : dropHint === 'child'
          ? 'bg-blue-50 ring-1 ring-inset ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-700'
          : ''

  return (
    <div
      className={`group flex min-h-11 items-center rounded-md pr-1 hover:bg-gray-100 md:min-h-0 dark:hover:bg-gray-800 ${
        isDragging ? 'opacity-40' : ''
      } ${dropClass}`}
      style={{ paddingLeft: `${depth * TREE_INDENT_PX + 4}px` }}
      draggable={!isRenaming}
      onDragStart={(event) => onDragStart(event, node.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, node.id)}
      onDragLeave={() => onDragLeave(node.id)}
      onDrop={(event) => onDrop(event, node.id)}
      onContextMenu={(event) => onContextMenu(event, node)}
    >
      <button
        type="button"
        aria-label={isCollapsed ? '展开' : '折叠'}
        onClick={(event) => {
          event.stopPropagation()
          if (hasChildren) onToggleCollapse(node.id)
        }}
        className={`touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600 md:h-6 md:w-8 dark:text-gray-500 dark:hover:text-gray-300 ${
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
            className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-100 dark:border-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:ring-blue-900/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelectNote(node.id)}
          className={`min-h-11 min-w-0 flex-1 truncate rounded px-3 py-2.5 text-left text-sm transition-colors md:min-h-0 md:px-2 md:py-1.5 ${
            isSelected
              ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
              : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
          }`}
          title={displayTitle}
        >
          <HighlightedText text={displayTitle} query={searchQuery} />
        </button>
      )}
    </div>
  )
}
