import type { Note } from '../../types/database'
import {
  formatJournalDateTitle,
  JOURNAL_FOLDER_TITLE,
} from './noteTemplates'

export { JOURNAL_FOLDER_TITLE, formatJournalDateTitle }

/** 查找根级「日记」文件夹 */
export function findJournalFolder(notes: Note[]): Note | null {
  return (
    notes.find(
      (note) =>
        note.parent_id === null && note.title.trim() === JOURNAL_FOLDER_TITLE,
    ) ?? null
  )
}

export function findJournalFolderId(notes: Note[]): string | null {
  return findJournalFolder(notes)?.id ?? null
}

/** 查找指定日期的日记（需在日记文件夹下） */
export function findJournalEntry(
  notes: Note[],
  folderId: string,
  date: Date = new Date(),
): Note | null {
  const title = formatJournalDateTitle(date)
  return (
    notes.find(
      (note) => note.parent_id === folderId && note.title.trim() === title,
    ) ?? null
  )
}

export function findTodayJournalId(
  notes: Note[],
  folderId: string,
  date: Date = new Date(),
): string | null {
  return findJournalEntry(notes, folderId, date)?.id ?? null
}
