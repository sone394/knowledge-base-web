import type { Note, NoteTreeNode } from '../../../types/database'

/** 展平后的笔记节点，含层级深度 */
export interface FlatNote extends Note {
  depth: number
}

/** 每层缩进像素 */
export const TREE_INDENT_PX = 12

/** 每个父节点初始可见子节点数，超出显示「加载更多」 */
export const CHILDREN_BATCH_SIZE = 50

/** 虚拟列表单行高度（px）— 桌面端 */
export const TREE_ROW_HEIGHT = 32

/** 虚拟列表单行高度（px）— 移动端（更大触摸区域） */
export const TREE_ROW_HEIGHT_MOBILE = 48

/** 「加载更多」行高度（px） */
export const TREE_LOAD_MORE_HEIGHT = 28

export type VirtualTreeNoteRow = {
  kind: 'note'
  node: NoteTreeNode
  depth: number
  hasChildren: boolean
  childCount: number
}

export type VirtualTreeLoadMoreRow = {
  kind: 'load-more'
  parentId: string
  depth: number
  remaining: number
}

export type VirtualTreeRow = VirtualTreeNoteRow | VirtualTreeLoadMoreRow

export type FlattenVisibleTreeOptions = {
  collapsedIds: Set<string>
  childLimits: Map<string, number>
  /** 搜索过滤后的可见节点 id；null 表示不过滤 */
  searchVisibleIds?: Set<string> | null
}

/** 父节点不在当前列表中时视为孤儿（例如父文件夹已在回收站） */
export function resolveTreeParentId(
  note: Pick<Note, 'id' | 'parent_id'>,
  activeIds: Set<string>,
): string | null {
  if (note.parent_id === null) return null
  return activeIds.has(note.parent_id) ? note.parent_id : null
}

export function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const activeIds = new Set(notes.map((note) => note.id))
  const byParent = new Map<string | null, Note[]>()

  for (const note of notes) {
    const key = resolveTreeParentId(note, activeIds)
    const group = byParent.get(key)
    if (group) {
      group.push(note)
    } else {
      byParent.set(key, [note])
    }
  }

  for (const group of byParent.values()) {
    group.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  }

  function build(parentId: string | null): NoteTreeNode[] {
    return (byParent.get(parentId) ?? []).map((note) => ({
      ...note,
      children: build(note.id),
    }))
  }

  return build(null)
}

/** 收集某节点的所有后代 id（不含自身） */
export function collectDescendantIds(
  parentId: string,
  notes: Pick<Note, 'id' | 'parent_id'>[],
): string[] {
  const result: string[] = []

  for (const note of notes) {
    if (note.parent_id === parentId) {
      result.push(note.id)
      result.push(...collectDescendantIds(note.id, notes))
    }
  }

  return result
}

export function flattenNoteTree(nodes: NoteTreeNode[], depth = 0): FlatNote[] {
  const result: FlatNote[] = []

  for (const { children, ...note } of nodes) {
    result.push({ ...note, depth })
    if (children?.length) {
      result.push(...flattenNoteTree(children, depth + 1))
    }
  }

  return result
}

/** 搜索时保留匹配节点及其祖先路径 */
export function collectSearchVisibleIds(
  nodes: NoteTreeNode[],
  searchQuery: string,
): Set<string> | null {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return null

  const visible = new Set<string>()

  function walk(node: NoteTreeNode, ancestors: string[]): boolean {
    const title = (node.title.trim() || '未命名笔记').toLowerCase()
    const selfMatch = title.includes(query)
    let childMatch = false

    for (const child of node.children ?? []) {
      if (walk(child, [...ancestors, node.id])) {
        childMatch = true
      }
    }

    if (selfMatch || childMatch) {
      ancestors.forEach((id) => visible.add(id))
      visible.add(node.id)
      return true
    }

    return false
  }

  for (const node of nodes) {
    walk(node, [])
  }

  return visible
}

/** 按展开状态展平可见节点，供虚拟列表渲染 */
export function flattenVisibleNoteTree(
  nodes: NoteTreeNode[],
  options: FlattenVisibleTreeOptions,
  depth = 0,
): VirtualTreeRow[] {
  const { collapsedIds, childLimits, searchVisibleIds = null } = options
  const result: VirtualTreeRow[] = []

  for (const node of nodes) {
    if (searchVisibleIds && !searchVisibleIds.has(node.id)) {
      continue
    }

    const children = node.children ?? []
    const hasChildren = children.length > 0
    const isCollapsed = searchVisibleIds ? false : collapsedIds.has(node.id)

    result.push({
      kind: 'note',
      node,
      depth,
      hasChildren,
      childCount: children.length,
    })

    if (hasChildren && !isCollapsed) {
      const limit = childLimits.get(node.id) ?? CHILDREN_BATCH_SIZE
      const visibleChildren = children.slice(0, limit)

      result.push(
        ...flattenVisibleNoteTree(visibleChildren, options, depth + 1),
      )

      const remaining = children.length - limit
      if (remaining > 0) {
        result.push({
          kind: 'load-more',
          parentId: node.id,
          depth: depth + 1,
          remaining,
        })
      }
    }
  }

  return result
}

export function findTreeNode(
  nodes: NoteTreeNode[],
  id: string,
): NoteTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findTreeNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export type TreeDropPosition = 'before' | 'after' | 'child'

/** 计算拖拽移动后的笔记更新（仅更新被拖动节点） */
export function computeTreeMoveUpdate(
  notes: Note[],
  dragId: string,
  targetId: string,
  position: TreeDropPosition,
): { id: string; parent_id: string | null; sort_order: number } | null {
  if (dragId === targetId) return null

  const dragNote = notes.find((note) => note.id === dragId)
  const targetNote = notes.find((note) => note.id === targetId)
  if (!dragNote || !targetNote) return null

  const descendantIds = new Set(collectDescendantIds(dragId, notes))
  if (descendantIds.has(targetId)) return null

  let parentId: string | null
  let insertIndex: number

  if (position === 'child') {
    parentId = targetId
    const siblings = notes
      .filter((note) => note.parent_id === parentId && note.id !== dragId)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    insertIndex = siblings.length
  } else {
    parentId = targetNote.parent_id
    const siblings = notes
      .filter((note) => note.parent_id === parentId && note.id !== dragId)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))

    const targetIndex = siblings.findIndex((note) => note.id === targetId)
    if (targetIndex === -1) return null

    insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  }

  const siblingsAtParent = notes
    .filter((note) => note.parent_id === parentId && note.id !== dragId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))

  const prev = siblingsAtParent[insertIndex - 1]
  const next = siblingsAtParent[insertIndex]
  let sortOrder: number

  if (!prev && !next) {
    sortOrder = 0
  } else if (!prev) {
    sortOrder = (next?.sort_order ?? 0) - 1
  } else if (!next) {
    sortOrder = prev.sort_order + 1
  } else {
    sortOrder = (prev.sort_order + next.sort_order) / 2
  }

  return {
    id: dragId,
    parent_id: parentId,
    sort_order: sortOrder,
  }
}
