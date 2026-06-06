export type HighlightedTextProps = {
  text: string
  query: string
  className?: string
}

/** 在文本中高亮显示搜索关键词（大小写不敏感） */
export default function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  const trimmed = query.trim()
  if (!trimmed) {
    return <span className={className}>{text}</span>
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let start = 0

  while (start < text.length) {
    const index = lowerText.indexOf(lowerQuery, start)
    if (index === -1) {
      parts.push({ text: text.slice(start), match: false })
      break
    }

    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false })
    }

    parts.push({
      text: text.slice(index, index + trimmed.length),
      match: true,
    })
    start = index + trimmed.length
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/30"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  )
}
