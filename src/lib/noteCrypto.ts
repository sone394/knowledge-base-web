import { decrypt, encrypt, isEncrypted } from './encryption'
import type { Note, NoteHistory, NoteUpdate } from '../../types/database'

function withReviewDefaults(note: Note): Note {
  return {
    ...note,
    needs_review: note.needs_review ?? false,
    review_interval: note.review_interval ?? 0,
    review_count: note.review_count ?? 0,
    next_review_date: note.next_review_date ?? null,
    is_shared: note.is_shared ?? false,
  }
}

export function decryptNote(note: Note, password: string): Note {
  const normalized = withReviewDefaults(note)
  if (!normalized.content) return normalized

  if (!isEncrypted(normalized.content)) {
    return normalized
  }

  return {
    ...normalized,
    content: decrypt(normalized.content, password),
  }
}

export function decryptNotes(notes: Note[], password: string): Note[] {
  return notes.map((note) => decryptNote(note, password))
}

export function encryptNoteUpdates(
  updates: NoteUpdate,
  password: string,
): NoteUpdate {
  if (updates.content === undefined) return updates

  return {
    ...updates,
    content: encrypt(updates.content, password),
  }
}

export function encryptNoteInsertContent(
  content: string,
  password: string,
): string {
  if (!content) return content
  return encrypt(content, password)
}

export function decryptNoteHistory(
  history: NoteHistory,
  password: string,
): NoteHistory {
  if (!history.content) return history

  if (!isEncrypted(history.content)) {
    return history
  }

  return {
    ...history,
    content: decrypt(history.content, password),
  }
}

export function decryptNoteHistories(
  histories: NoteHistory[],
  password: string,
): NoteHistory[] {
  return histories.map((history) => decryptNoteHistory(history, password))
}
