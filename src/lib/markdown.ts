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

/** Markdown → HTML，供 TipTap 加载 */
export function markdownToHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('<')) return markdown
  return marked.parse(preprocessWikiLinks(trimmed), { async: false }) as string
}

/** HTML → Markdown，供保存到 Supabase */
export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return ''
  return turndown.turndown(html).trim()
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
