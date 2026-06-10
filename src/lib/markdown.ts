import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

turndown.use(gfm)

turndown.addRule('underline', {
  filter: ['u'],
  replacement: (content) => `<u>${content}</u>`,
})

turndown.addRule('highlight', {
  filter: (node) =>
    node.nodeName === 'MARK' && !node.getAttribute('data-comment'),
  replacement: (content) => `==${content}==`,
})

turndown.addRule('coloredText', {
  filter: (node) => {
    if (node.nodeName !== 'SPAN') return false
    const style = node.getAttribute('style') ?? ''
    return style.includes('color')
  },
  replacement: (content, node) => {
    const element = node as HTMLElement
    const color = element.style.color
    return color ? `<span style="color:${color}">${content}</span>` : content
  },
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

turndown.addRule('callout', {
  filter: (node) =>
    node.nodeName === 'DIV' && node.getAttribute('data-callout') !== null,
  replacement: (content, node) => {
    const type = node.getAttribute('data-callout-type') || 'info'
    const lines = content.trim().split('\n').map((line) => `> ${line}`)
    return `> [!${type}]\n${lines.join('\n')}\n`
  },
})

turndown.addRule('comment', {
  filter: (node) =>
    node.nodeName === 'MARK' && node.getAttribute('data-comment') !== null,
  replacement: (content, node) => {
    const text = node.getAttribute('data-comment') ?? ''
    return `%%${content}|${text}%%`
  },
})

turndown.addRule('mathInline', {
  filter: (node) => node.nodeName === 'SPAN' && node.getAttribute('data-math-inline') !== null,
  replacement: (_content, node) => {
    const latex = node.getAttribute('data-latex') ?? ''
    return `$${latex}$`
  },
})

turndown.addRule('mathBlock', {
  filter: (node) => node.nodeName === 'DIV' && node.getAttribute('data-math-block') !== null,
  replacement: (_content, node) => {
    const latex = node.getAttribute('data-latex') ?? ''
    return `$$\n${latex}\n$$\n`
  },
})

turndown.addRule('image', {
  filter: 'img',
  replacement: (_content, node) => {
    const element = node as HTMLImageElement
    const alt = element.getAttribute('alt') ?? ''
    const src = element.getAttribute('src') ?? ''
    return `![${alt}](${src})`
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

function preprocessHighlights(markdown: string): string {
  return markdown.replace(/==([^=]+)==/g, '<mark>$1</mark>')
}

function preprocessComments(markdown: string): string {
  return markdown.replace(
    /%%([^|%]+)\|([^%]+)%%/g,
    '<mark data-comment="$2" class="editor-comment" title="$2">$1</mark>',
  )
}

function preprocessMath(markdown: string): string {
  let result = markdown.replace(
    /\$\$\n([\s\S]+?)\n\$\$/g,
    '<div data-math-block="" class="math-block" data-latex="$1">$1</div>',
  )
  result = result.replace(
    /\$([^$\n]+)\$/g,
    '<span data-math-inline="" class="math-inline" data-latex="$1">$1</span>',
  )
  return result
}

function preprocessCallouts(markdown: string): string {
  return markdown.replace(
    />\s*\[!(\w+)\]\s*\n((?:>.*\n?)*)/g,
    (_match, type: string, body: string) => {
      const inner = body
        .split('\n')
        .map((line) => line.replace(/^>\s?/, ''))
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join('')
      return `<div data-callout="" data-callout-type="${type}" class="callout callout-${type}">${inner}</div>`
    },
  )
}

function preprocessCustomMarkdown(markdown: string): string {
  return preprocessCallouts(
    preprocessMath(
      preprocessComments(
        preprocessHighlights(preprocessWikiLinks(markdown)),
      ),
    ),
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
  return marked.parse(preprocessCustomMarkdown(trimmed), {
    async: false,
  }) as string
}

/** Markdown → HTML，供编辑器加载（软换行会拆成独立段落） */
export function markdownToEditorHtml(markdown: string): string {
  const trimmed = markdown.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('<')) return markdown
  return marked.parse(
    preprocessCustomMarkdown(paragraphizeSoftBreaks(trimmed)),
    { async: false },
  ) as string
}

/** 将标题内的软换行拆成独立块，避免保存后再加载时多行重新粘成同一标题 */
function splitHeadingBreaksInHtml(html: string): string {
  return html.replace(
    /<h([1-6])>([\s\S]*?)<\/h\1>/gi,
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
