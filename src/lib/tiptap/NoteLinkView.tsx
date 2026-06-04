import { Link } from 'react-router-dom'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'

export function NoteLinkView({ node }: NodeViewProps) {
  const id = node.attrs.id as string
  const label = (node.attrs.label as string) || '未命名笔记'

  return (
    <NodeViewWrapper as="span" className="note-link-node inline">
      <Link
        to={`/note/${id}`}
        className="note-internal-link text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
        contentEditable={false}
        onMouseDown={(event) => event.preventDefault()}
      >
        {label}
      </Link>
    </NodeViewWrapper>
  )
}
