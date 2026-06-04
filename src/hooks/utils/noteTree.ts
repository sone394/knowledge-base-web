import type { Note, NoteTreeNode } from '../../../types/database'

/** 展平后的笔记节点，含层级深度 */
export interface FlatNote extends Note {
  depth: number
}

export function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const byParent = new Map<string | null, Note[]>()

  for (const note of notes) {
    const key = note.parent_id
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
