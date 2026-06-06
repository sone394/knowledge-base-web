import { useState } from 'react'
import { shareNoteContent } from '../lib/noteShare'

type MobileShareButtonProps = {
  title: string
  content: string
}

export default function MobileShareButton({ title, content }: MobileShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleShare = async () => {
    try {
      await shareNoteContent(title, content)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setFeedback('分享失败')
      window.setTimeout(() => setFeedback(null), 2000)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="touch-target flex items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label="分享笔记"
        title="分享笔记"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
      {feedback && (
        <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white dark:bg-gray-100 dark:text-gray-900">
          {feedback}
        </span>
      )}
    </div>
  )
}
