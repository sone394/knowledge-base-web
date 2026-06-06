export type NoteTemplateId = 'blank' | 'reading' | 'meeting' | 'daily'

export type NoteTemplateContext = {
  date?: Date
}

export type NoteTemplate = {
  id: NoteTemplateId
  name: string
  description: string
  resolveTitle: (context?: NoteTemplateContext) => string
  content: string
  /** 创建后是否自动进入标题重命名 */
  renameOnCreate: boolean
}

const READING_NOTES_CONTENT = `# 读书笔记

## 基本信息
- 书名：
- 作者：
- 阅读日期：

## 核心观点


## 摘录


## 感想
`

const MEETING_MINUTES_CONTENT = `# 会议纪要

## 会议信息
- 时间：
- 地点：
- 参与人：

## 议题


## 决议与待办
- [ ]
`

const DAILY_JOURNAL_CONTENT = `## 今日记录


## 反思

`

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: '空白笔记',
    description: '从空白页开始',
    resolveTitle: () => '未命名笔记',
    content: '',
    renameOnCreate: true,
  },
  {
    id: 'reading',
    name: '读书笔记',
    description: '书名、摘录与感想',
    resolveTitle: () => '读书笔记',
    content: READING_NOTES_CONTENT,
    renameOnCreate: true,
  },
  {
    id: 'meeting',
    name: '会议纪要',
    description: '议题、决议与待办',
    resolveTitle: () => '会议纪要',
    content: MEETING_MINUTES_CONTENT,
    renameOnCreate: true,
  },
  {
    id: 'daily',
    name: '日记',
    description: '今日记录与反思',
    resolveTitle: (context) => formatJournalDateTitle(context?.date),
    content: DAILY_JOURNAL_CONTENT,
    renameOnCreate: false,
  },
]

/** 日记文件夹名称 */
export const JOURNAL_FOLDER_TITLE = '日记'

/** 生成日记标题，格式 YYYY-MM-DD */
export function formatJournalDateTitle(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getNoteTemplate(id: NoteTemplateId): NoteTemplate {
  const template = NOTE_TEMPLATES.find((item) => item.id === id)
  if (!template) throw new Error(`未知模板：${id}`)
  return template
}

export function buildNoteFromTemplate(
  templateId: NoteTemplateId,
  context?: NoteTemplateContext,
): { title: string; content: string; renameOnCreate: boolean } {
  const template = getNoteTemplate(templateId)
  return {
    title: template.resolveTitle(context),
    content: template.content,
    renameOnCreate: template.renameOnCreate,
  }
}
