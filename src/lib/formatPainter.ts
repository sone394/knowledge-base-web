import type { Editor } from '@tiptap/react'

export type FormatSnapshot = {
  marks: Array<{ type: string; attrs: Record<string, unknown> }>
}

let cachedFormat: FormatSnapshot | null = null
let painterActive = false

export function captureFormat(editor: Editor): FormatSnapshot | null {
  const { from, to } = editor.state.selection
  if (from === to) return null

  const $from = editor.state.doc.resolve(from)
  const marks = $from.marks().map((mark) => ({
    type: mark.type.name,
    attrs: { ...mark.attrs },
  }))

  if (marks.length === 0) return null
  return { marks }
}

export function activateFormatPainter(snapshot: FormatSnapshot) {
  cachedFormat = snapshot
  painterActive = true
}

export function deactivateFormatPainter() {
  painterActive = false
  cachedFormat = null
}

export function isFormatPainterActive() {
  return painterActive
}

export function applyFormatPainter(editor: Editor): boolean {
  if (!painterActive || !cachedFormat) return false

  const { from, to } = editor.state.selection
  if (from === to) return false

  let chain = editor.chain().focus().setTextSelection({ from, to })

  for (const mark of cachedFormat.marks) {
    chain = chain.setMark(mark.type, mark.attrs)
  }

  chain.run()
  deactivateFormatPainter()
  return true
}

export function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().run()
}
