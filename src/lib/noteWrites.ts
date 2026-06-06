import type { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabaseClient'
import {
  decryptNote,
  encryptNoteInsertContent,
  encryptNoteUpdates,
} from './noteCrypto'
import { enqueueOutbox } from './outbox'
import { isOnline, shouldQueueOffline } from './network'
import { queryKeys } from '../hooks/queryKeys'
import { collectDescendantIds } from '../hooks/utils/noteTree'
import type { Note, NoteInsert, NoteUpdate } from '../../types/database'

export type WriteResult<T> = {
  data: T
  offline: boolean
}

function buildOptimisticNote(
  input: NoteInsert,
  noteId: string,
  plaintextContent?: string,
): Note {
  const now = new Date().toISOString()

  return {
    id: noteId,
    user_id: input.user_id,
    parent_id: input.parent_id ?? null,
    title: input.title ?? '',
    content: plaintextContent ?? input.content ?? '',
    summary: input.summary ?? null,
    sort_order: input.sort_order ?? 0,
    deleted_at: null,
    needs_review: input.needs_review ?? false,
    review_interval: input.review_interval ?? 0,
    next_review_date: input.next_review_date ?? null,
    review_count: input.review_count ?? 0,
    created_at: now,
    updated_at: now,
  }
}

export function getNoteFromLocalCache(
  queryClient: QueryClient,
  noteId: string,
): Note | null {
  const detail = queryClient.getQueryData<Note>(queryKeys.notes.detail(noteId))
  if (detail) return detail

  const notes = queryClient.getQueryData<Note[]>(queryKeys.notes.tree())
  return notes?.find((note) => note.id === noteId) ?? null
}

export async function createNoteWrite(
  input: NoteInsert,
  password: string,
  plaintextContent = '',
): Promise<WriteResult<Note>> {
  const noteId = input.id ?? crypto.randomUUID()
  const payload: NoteInsert = {
    ...input,
    id: noteId,
    content: encryptNoteInsertContent(input.content ?? '', password),
  }
  const optimistic = buildOptimisticNote(input, noteId, plaintextContent)

  const writeOffline = async () => {
    await enqueueOutbox({
      type: 'insert',
      noteId,
      payload,
    })
    return { data: optimistic, offline: true as const }
  }

  if (!isOnline()) {
    return writeOffline()
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return { data: decryptNote(data, password), offline: false }
  } catch (error) {
    if (shouldQueueOffline(error)) {
      return writeOffline()
    }
    throw error
  }
}

export async function updateNoteWrite(
  id: string,
  updates: NoteUpdate,
  password: string,
  currentNote: Note,
): Promise<WriteResult<Note>> {
  const encryptedUpdates = encryptNoteUpdates(updates, password)
  const optimistic: Note = {
    ...currentNote,
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const writeOffline = async () => {
    await enqueueOutbox({
      type: 'update',
      noteId: id,
      payload: encryptedUpdates,
    })
    return { data: optimistic, offline: true as const }
  }

  if (!isOnline()) {
    return writeOffline()
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .update(encryptedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: decryptNote(data, password), offline: false }
  } catch (error) {
    if (shouldQueueOffline(error)) {
      return writeOffline()
    }
    throw error
  }
}

export async function deleteNoteWrite(
  id: string,
  activeNotes: Note[],
): Promise<WriteResult<string>> {
  const descendantIds = collectDescendantIds(id, activeNotes)
  const idsToDelete = [id, ...descendantIds]
  const deletedAt = new Date().toISOString()
  const payload: NoteUpdate = { deleted_at: deletedAt }

  const writeOffline = async () => {
    for (const noteId of idsToDelete) {
      await enqueueOutbox({
        type: 'update',
        noteId,
        payload,
      })
    }
    return { data: id, offline: true as const }
  }

  if (!isOnline()) {
    return writeOffline()
  }

  try {
    const { error } = await supabase
      .from('notes')
      .update(payload)
      .in('id', idsToDelete)

    if (error) throw error
    return { data: id, offline: false }
  } catch (error) {
    if (shouldQueueOffline(error)) {
      return writeOffline()
    }
    throw error
  }
}

export function patchNotesTreeCache(
  queryClient: QueryClient,
  updater: (notes: Note[]) => Note[],
): void {
  queryClient.setQueryData<Note[]>(queryKeys.notes.tree(), (current) => {
    if (!current) return current
    return updater(current)
  })
}
