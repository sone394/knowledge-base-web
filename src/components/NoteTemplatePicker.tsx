import {
  buildNoteFromTemplate,
  NOTE_TEMPLATES,
  type NoteTemplateId,
} from '../lib/noteTemplates'

export type NoteTemplatePickerProps = {
  open: boolean
  parentLabel?: string | null
  onSelect: (templateId: NoteTemplateId) => void
  onClose: () => void
}

export default function NoteTemplatePicker({
  open,
  parentLabel,
  onSelect,
  onClose,
}: NoteTemplatePickerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl dark:border dark:border-gray-700 dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
      >
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3
            id="template-picker-title"
            className="text-base font-semibold text-gray-900 dark:text-gray-100"
          >
            选择笔记模板
          </h3>
          {parentLabel && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              将创建为「{parentLabel}」的子笔记
            </p>
          )}
        </div>

        <ul className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
          {NOTE_TEMPLATES.filter((template) => template.id !== 'daily').map(
            (template) => {
              const preview = buildNoteFromTemplate(template.id)
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(template.id)}
                    className="touch-target flex w-full flex-col rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {template.name}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {template.description}
                    </span>
                    {preview.content && (
                      <span className="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                        {preview.content.split('\n').find((line) => line.trim()) ??
                          template.description}
                      </span>
                    )}
                  </button>
                </li>
              )
            },
          )}
        </ul>

        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="touch-target w-full rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
