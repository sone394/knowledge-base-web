import { useVirtualizer } from '@tanstack/react-virtual'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react'
import type { NoteTreeNode } from '../hooks/useNotes'
import {
  CHILDREN_BATCH_SIZE,
  collectSearchVisibleIds,
  flattenVisibleNoteTree,
  TREE_INDENT_PX,
  TREE_LOAD_MORE_HEIGHT,
  TREE_ROW_HEIGHT,
  TREE_ROW_HEIGHT_MOBILE,
  type TreeDropPosition,
  type VirtualTreeRow,
} from '../hooks/utils/noteTree'
import { useIsMobile } from '../hooks/useMediaQuery'
import NoteTreeRow from './NoteTreeRow'
import SwipeableNoteTreeRow from './SwipeableNoteTreeRow'

export type NoteVirtualTreeProps = {
  tree: NoteTreeNode[]
  selectedNoteId?: string | null
  searchQuery?: string
  collapsedIds: Set<string>
  renamingId: string | null
  renameValue: string
  draggingId: string | null
  dropTarget: { id: string; position: TreeDropPosition } | null
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
  onScroll?: () => void
  onPinNote?: (note: NoteTreeNode) => void
  onDeleteNote?: (note: NoteTreeNode) => void
}

function getRowHeight(row: VirtualTreeRow, isMobile: boolean): number {
  if (row.kind === 'load-more') return TREE_LOAD_MORE_HEIGHT
  return isMobile ? TREE_ROW_HEIGHT_MOBILE : TREE_ROW_HEIGHT
}

export default function NoteVirtualTree({
  tree,
  selectedNoteId,
  searchQuery = '',
  collapsedIds,
  renamingId,
  renameValue,
  draggingId,
  dropTarget,
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
  onScroll,
  onPinNote,
  onDeleteNote,
}: NoteVirtualTreeProps) {
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [childLimits, setChildLimits] = useState(() => new Map<string, number>())

  const searchVisibleIds = useMemo(
    () => collectSearchVisibleIds(tree, searchQuery),
    [tree, searchQuery],
  )

  const rows = useMemo(
    () =>
      flattenVisibleNoteTree(tree, {
        collapsedIds,
        childLimits,
        searchVisibleIds,
      }),
    [tree, collapsedIds, childLimits, searchVisibleIds],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => getRowHeight(rows[index], isMobile),
    overscan: 12,
  })

  const handleLoadMore = useCallback((parentId: string) => {
    setChildLimits((prev) => {
      const next = new Map(prev)
      const current = next.get(parentId) ?? CHILDREN_BATCH_SIZE
      next.set(parentId, current + CHILDREN_BATCH_SIZE)
      return next
    })
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !onScroll) return

    const handleScroll = () => onScroll()
    element.addEventListener('scroll', handleScroll, { passive: true })
    return () => element.removeEventListener('scroll', handleScroll)
  }, [onScroll])

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto p-2"
      role="presentation"
    >
      <nav
        aria-label="笔记目录"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === 'note' ? (
                isMobile && (onPinNote || onDeleteNote) ? (
                  <SwipeableNoteTreeRow
                    node={row.node}
                    depth={row.depth}
                    hasChildren={row.hasChildren}
                    isCollapsed={collapsedIds.has(row.node.id)}
                    isSelected={selectedNoteId === row.node.id}
                    isRenaming={renamingId === row.node.id}
                    renameValue={renameValue}
                    searchQuery={searchQuery}
                    isDragging={draggingId === row.node.id}
                    dropHint={
                      dropTarget?.id === row.node.id ? dropTarget.position : null
                    }
                    onToggleCollapse={onToggleCollapse}
                    onSelectNote={onSelectNote}
                    onContextMenu={onContextMenu}
                    onRenameChange={onRenameChange}
                    onRenameSubmit={onRenameSubmit}
                    onRenameCancel={onRenameCancel}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onPin={onPinNote}
                    onDelete={onDeleteNote}
                  />
                ) : (
                  <NoteTreeRow
                    node={row.node}
                    depth={row.depth}
                    hasChildren={row.hasChildren}
                    isCollapsed={collapsedIds.has(row.node.id)}
                    isSelected={selectedNoteId === row.node.id}
                    isRenaming={renamingId === row.node.id}
                    renameValue={renameValue}
                    searchQuery={searchQuery}
                    isDragging={draggingId === row.node.id}
                    dropHint={
                      dropTarget?.id === row.node.id ? dropTarget.position : null
                    }
                    onToggleCollapse={onToggleCollapse}
                    onSelectNote={onSelectNote}
                    onContextMenu={onContextMenu}
                    onRenameChange={onRenameChange}
                    onRenameSubmit={onRenameSubmit}
                    onRenameCancel={onRenameCancel}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  />
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleLoadMore(row.parentId)}
                  className="touch-target flex w-full items-center rounded-md px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                  style={{
                    paddingLeft: `${row.depth * TREE_INDENT_PX + 28}px`,
                    minHeight: `${TREE_LOAD_MORE_HEIGHT}px`,
                  }}
                >
                  加载更多（还有 {row.remaining} 项）
                </button>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
