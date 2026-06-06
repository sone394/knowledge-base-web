import { getRouterBasename } from './getRouterBasename'

export function buildShareUrl(noteId: string): string {
  const basename = getRouterBasename()
  const path = `${basename}/share/${noteId}`.replace(/\/{2,}/g, '/')
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function canUseNativeShare(): boolean {
  return typeof navigator.share === 'function'
}

export async function shareNoteContent(title: string, content: string): Promise<void> {
  const shareTitle = title.trim() || '无标题'
  const shareText = content.trim() || '（空笔记）'

  if (canUseNativeShare()) {
    await navigator.share({
      title: shareTitle,
      text: shareText,
    })
    return
  }

  const fallback = `${shareTitle}\n\n${shareText}`
  await copyTextToClipboard(fallback)
}
