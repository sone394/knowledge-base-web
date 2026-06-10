import TurndownService from 'turndown'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

turndown.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
})

turndown.addRule('noteLink', {
  filter: (node) => {
    if (node.nodeName !== 'A') return false
    return (
      node.getAttribute('data-note-id') !== null ||
      (node.getAttribute('href') ?? '').startsWith('/note/')
    )
  },
  replacement: (content, node) => {
    const element = node as HTMLElement
    const id =
      element.getAttribute('data-note-id') ??
      element.getAttribute('href')?.replace(/^\/note\//, '') ??
      ''
    const label = content.trim() || '未命名笔记'
    return `[[${label}|${id}]]`
  },
})

/** 将 [[标题|id]] 维基链接转为 HTML */
export function preprocessWikiLinks(markdown: string): string {
  return markdown.replace(
    /\[\[([^|\]]+?)\|([^\]]+?)\]\]/g,
    (_match, label: string, id: string) => {
      const escapedLabel = label.trim()
      return `<a href="/note/${id.trim()}" data-note-id="${id.trim()}" data-type="note-link" class="note-internal-link">${escapedLabel}</a>`
    },
  )
}

/** 将 Markdown 软换行提升为段落分隔，避免多行被合并为同一段 */
function paragraphizeSoftBreaks(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i])
    if (i >= lines.length - 1) continue

    const current = lines[i]
    const next = lines[i + 1]

    if (current.trim() === '' || next.trim() === '') continue
    if (/^\s*([#>\-*]|\d+\.)/.test(next)) continue

    result.push('')
  }

  return result.join('\n')
}

/** Markdown → HTML，供 TipTap 加载 */
export function markdownToHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('<')) return markdown
  return marked.parse(preprocessWikiLinks(trimmed), { async: false }) as string
}

/** Markdown → HTML，供编辑器加载（软换行会拆成独立段落） */
export function markdownToEditorHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('<')) return markdown
  return marked.parse(
    preprocessWikiLinks(paragraphizeSoftBreaks(trimmed)),
    { async: false },
  ) as string
}

/** 将标题内的软换行拆成独立块，避免保存后再加载时多行重新粘成同一标题 */
function splitHeadingBreaksInHtml(html: string): string {
  return html.replace(
    /<h([1-3])>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, inner: string) => {
      if (!/<br\s*\/?>/i.test(inner)) return _match
      const parts = inner
        .split(/<br\s*\/?>/i)
        .map((part) => part.trim())
        .filter(Boolean)
      return parts
        .map((part, index) =>
          index === 0 ? `<h${level}>${part}</h${level}>` : `<p>${part}</p>`,
        )
        .join('')
    },
  )
}

/** HTML → Markdown，供保存到 Supabase */
export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return ''
  return turndown.turndown(splitHeadingBreaksInHtml(html)).trim()
}

/** 格式化最后保存时间 */
export function formatSavedTime(iso: string | undefined): string {
  if (!iso) return '尚未保存'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}
