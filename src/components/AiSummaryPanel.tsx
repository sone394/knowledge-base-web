type AiSummaryPanelProps = {
  summary?: string | null
  isGenerating: boolean
  canGenerate: boolean
  error: Error | null
  onGenerate: () => void
}

export default function AiSummaryPanel({
  summary,
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: AiSummaryPanelProps) {
  const hasSummary = !!summary?.trim()
  const showPanel = hasSummary || isGenerating || canGenerate

  if (!showPanel) return null

  return (
    <section className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            AI 摘要
          </h3>
          {canGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="touch-target shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              {isGenerating
                ? '生成中…'
                : hasSummary
                  ? '重新生成'
                  : '生成摘要'}
            </button>
          )}
        </div>

        {isGenerating && !hasSummary ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">正在生成摘要…</p>
        ) : hasSummary ? (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {summary}
          </p>
        ) : canGenerate ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            点击「生成摘要」获取 AI 总结与标签建议
          </p>
        ) : null}

        {error && (
          <p className="mt-2 text-xs text-red-500" role="alert">
            {error.message}
          </p>
        )}
      </div>
    </section>
  )
}
