import type { SuggestionMatch, Trigger } from '@tiptap/suggestion'

/** 匹配光标前的 [[query 片段 */
export function findWikiLinkMatch(config: Trigger): SuggestionMatch {
  const { $position } = config
  const text = $position.nodeBefore?.isText && $position.nodeBefore.text

  if (!text) {
    return null
  }

  const textFrom = $position.pos - text.length
  const match = text.match(/\[\[([^\]]*)$/)

  if (!match || match.index === undefined) {
    return null
  }

  const from = textFrom + match.index
  const to = $position.pos

  return {
    range: { from, to },
    query: match[1] ?? '',
    text: match[0],
  }
}
