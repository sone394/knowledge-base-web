import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useEncryption } from '../context/EncryptionContext'
import {
  decryptNote,
  decryptNoteHistories,
  encryptNoteUpdates,
} from '../lib/noteCrypto'
import type { NoteHistory } from '../../types/database'
import { queryKeys } from './queryKeys'

async function fetchNoteHistoryFromDb(noteId: string): Promise<NoteHistory[]> {
  const { data, error } = await supabase
    .from('note_history')
    .select('*')
    .eq('note_id', noteId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export function useNoteHistory(noteId: string | undefined) {
  const { password, isUnlocked } = useEncryption()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.noteHistory.byNote(noteId ?? ''),
    queryFn: async () => {
      const raw = await fetchNoteHistoryFromDb(noteId!)
      return decryptNoteHistories(raw, password!)
    },
    enabled: !!noteId && isUnlocked && !!password,
  })

  const invalidateHistory = (id: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.noteHistory.byNote(id),
    })
  }

  const restoreVersion = useMutation({
    mutationFn: async (historyId: string) => {
      if (!noteId || !password) throw new Error('无法恢复版本')

      const { data: version, error: versionError } = await supabase
        .from('note_history')
        .select('*')
        .eq('id', historyId)
        .single()

      if (versionError) throw versionError

      const { data: currentRaw, error: currentError } = await supabase
        .from('notes')
        .select('title, content')
        .eq('id', noteId)
        .single()

      if (currentError) throw currentError

      const { error: snapshotError } = await supabase.from('note_history').insert({
        note_id: noteId,
        title: currentRaw.title,
        content: currentRaw.content,
      })

      if (snapshotError) throw snapshotError

      const updates = encryptNoteUpdates(
        {
          title: version.title ?? '',
          content: version.content ?? '',
        },
        password,
      )

      const { data: updated, error: updateError } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single()

      if (updateError) throw updateError

      return decryptNote(updated, password)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notes.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.tree() })
      invalidateHistory(data.id)
    },
  })

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    restoreVersion,
  }
}
