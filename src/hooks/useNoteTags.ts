import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { decryptNotes } from '../lib/noteCrypto'
import { useEncryption } from '../context/EncryptionContext'
import type { Note, Tag } from '../../types/database'
import { queryKeys } from './queryKeys'

async function fetchNoteTags(noteId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('note_tags')
    .select('tags(*)')
    .eq('note_id', noteId)

  if (error) throw error

  return (data ?? [])
    .map((row) => row.tags)
    .filter((tag): tag is Tag => tag !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function fetchNotesByTag(tagId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('note_tags')
    .select('notes(*)')
    .eq('tag_id', tagId)

  if (error) throw error

  return (data ?? [])
    .map((row) => row.notes)
    .filter((note): note is Note => note !== null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function useNoteTags(noteId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.noteTags.byNote(noteId ?? ''),
    queryFn: () => fetchNoteTags(noteId!),
    enabled: !!noteId,
  })

  const invalidateNoteTags = (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.noteTags.byNote(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })
  }

  const addTag = useMutation({
    mutationFn: async ({
      noteId: targetNoteId,
      tagId,
    }: {
      noteId: string
      tagId: string
    }) => {
      const { error } = await supabase
        .from('note_tags')
        .insert({ note_id: targetNoteId, tag_id: tagId })

      if (error) throw error
      return { noteId: targetNoteId, tagId }
    },
    onSuccess: ({ noteId: id, tagId }) => {
      invalidateNoteTags(id)
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.byTag(tagId) })
    },
  })

  const removeTag = useMutation({
    mutationFn: async ({
      noteId: targetNoteId,
      tagId,
    }: {
      noteId: string
      tagId: string
    }) => {
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', targetNoteId)
        .eq('tag_id', tagId)

      if (error) throw error
      return { noteId: targetNoteId, tagId }
    },
    onSuccess: ({ noteId: id, tagId }) => {
      invalidateNoteTags(id)
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.byTag(tagId) })
    },
  })

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    addTag,
    removeTag,
  }
}

/** 按标签筛选笔记 */
export function useNotesByTag(tagId: string | undefined) {
  const { password, isUnlocked } = useEncryption()

  const query = useQuery({
    queryKey: queryKeys.notes.byTag(tagId ?? ''),
    queryFn: async () => {
      const notes = await fetchNotesByTag(tagId!)
      return decryptNotes(notes, password!)
    },
    enabled: !!tagId && isUnlocked && !!password,
  })

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
