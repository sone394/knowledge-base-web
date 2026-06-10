import type { Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Fragment } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'

type LineSegment = {
  nodes: PMNode[]
}

function getTextblockLines(block: PMNode): LineSegment[] {
  const lines: LineSegment[] = [{ nodes: [] }]

  block.forEach((child) => {
    if (child.type.name === 'hardBreak') {
      lines.push({ nodes: [] })
      return
    }
    lines[lines.length - 1].nodes.push(child)
  })

  return lines.filter((line) => line.nodes.length > 0)
}

function getCursorLineIndex(block: PMNode, parentOffset: number): number {
  let lineIndex = 0
  let offset = 0

  for (let i = 0; i < block.childCount; i++) {
    const child = block.child(i)

    if (child.type.name === 'hardBreak') {
      if (offset < parentOffset) {
        lineIndex += 1
      }
      offset += 1
      continue
    }

    const childEnd = offset + child.nodeSize
    if (parentOffset <= childEnd) {
      return lineIndex
    }
    offset = childEnd
  }

  return lineIndex
}

function blockHasHardBreak(block: PMNode): boolean {
  let found = false
  block.forEach((child) => {
    if (child.type.name === 'hardBreak') {
      found = true
    }
  })
  return found
}

/** 仅对光标所在行切换标题，避免同一段内多行一起被改成同一级标题 */
export function toggleHeadingOnCurrentLine(
  editor: Editor,
  level: 1 | 2 | 3 | 4 | 5 | 6,
): void {
  const { state } = editor
  const { $from } = state.selection

  let blockDepth = $from.depth
  while (blockDepth > 0 && !$from.node(blockDepth).type.isTextblock) {
    blockDepth -= 1
  }

  const block = $from.node(blockDepth)
  if (!block.type.isTextblock || !blockHasHardBreak(block)) {
    editor.chain().focus().toggleHeading({ level }).run()
    return
  }

  const lines = getTextblockLines(block)
  const cursorLineIndex = getCursorLineIndex(block, $from.parentOffset)
  const blockPos = $from.before(blockDepth)

  editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const { schema } = state
      const newNodes: PMNode[] = []

      lines.forEach((line, index) => {
        const fragment = Fragment.from(line.nodes)

        if (index === cursorLineIndex) {
          const isActive =
            block.type.name === 'heading' && block.attrs.level === level
          newNodes.push(
            isActive
              ? schema.nodes.paragraph.create(null, fragment)
              : schema.nodes.heading.create({ level }, fragment),
          )
          return
        }

        newNodes.push(schema.nodes.paragraph.create(null, fragment))
      })

      tr.replaceWith(blockPos, blockPos + block.nodeSize, newNodes)

      let cursorPos = blockPos + 1
      for (let i = 0; i < cursorLineIndex; i++) {
        cursorPos += newNodes[i].nodeSize
      }
      cursorPos = Math.min(cursorPos + 1, tr.doc.content.size)
      tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)))

      dispatch?.(tr)
      return true
    })
    .run()
}
