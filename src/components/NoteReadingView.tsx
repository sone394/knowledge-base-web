import { useEffect, useMemo, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { markdownToHtml } from '../lib/markdown'

type NoteReadingViewProps = {
  title: string
  content: string
}

function renderMathInElement(container: HTMLElement) {
  container.querySelectorAll('.math-inline').forEach((element) => {
    const latex = element.getAttribute('data-latex')
    if (!latex) return
    try {
      katex.render(latex, element as HTMLElement, {
        throwOnError: false,
        displayMode: false,
      })
    } catch {
      // keep raw latex
    }
  })

  container.querySelectorAll('.math-block').forEach((element) => {
    const latex = element.getAttribute('data-latex')
    if (!latex) return
    try {
      katex.render(latex, element as HTMLElement, {
        throwOnError: false,
        displayMode: true,
      })
    } catch {
      // keep raw latex
    }
  })
}

export default function NoteReadingView({
  title,
  content,
}: NoteReadingViewProps) {
  const html = useMemo(() => markdownToHtml(content), [content])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      renderMathInElement(containerRef.current)
    }
  }, [html])

  return (
    <article className="note-reading-view">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {title.trim() || '无标题'}
      </h1>
      <div
        ref={containerRef}
        className="note-editor-content prose-like"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}
