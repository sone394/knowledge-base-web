/** AI 摘要/标签生成的最低正文字数（去空白后） */
export const MIN_CONTENT_LENGTH_FOR_AI = 200

/** 统计正文有效字数（去除空白字符） */
export function countContentCharacters(content: string): number {
  return content.replace(/\s/g, '').length
}

/** 统计标题 + 正文有效字数（去除空白字符），用于编辑器底部字数展示 */
export function countNoteCharacters(title: string, content: string): number {
  return `${title}${content}`.replace(/\s/g, '').length
}

/** 正文是否达到 AI 生成阈值 */
export function meetsMinLengthForAi(content: string): boolean {
  return countContentCharacters(content) >= MIN_CONTENT_LENGTH_FOR_AI
}
