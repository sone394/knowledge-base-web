import { findParentNode } from '@tiptap/core'
import type { Editor } from '@tiptap/react'

function findTableMatch(editor: Editor) {
  const { selection } = editor.state
  return findParentNode((node) => node.type.name === 'table')(selection)
}

/** 光标或选区是否在表格内（比 isActive('table') 更可靠） */
export function isInTable(editor: Editor): boolean {
  if (
    editor.isActive('table') ||
    editor.isActive('tableCell') ||
    editor.isActive('tableHeader') ||
    editor.isActive('tableRow')
  ) {
    return true
  }
  return findTableMatch(editor) !== undefined
}

/** 删除当前光标所在的整张表格 */
export function deleteTableInEditor(editor: Editor): boolean {
  if (editor.chain().focus().deleteTable().run()) {
    return true
  }

  const match = findTableMatch(editor)
  if (!match) return false

  return editor
    .chain()
    .focus()
    .deleteRange({ from: match.pos, to: match.pos + match.node.nodeSize })
    .run()
}
