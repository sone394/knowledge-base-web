import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import { decryptNotes } from '../lib/noteCrypto'
import type { Note } from '../../types/database'
import { queryKeys } from './queryKeys'
import { collectDescendantIds } from './utils/noteTree'

async function fetchTrashNotesFromDb(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export function useTrash() {
  const { user } = useAuth()
  const { password, isUnlocked } = useEncryption()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.trash.all,
    queryFn: async () => {
      const raw = await fetchTrashNotesFromDb()
      return decryptNotes(raw, password!)
    },
    enabled: !!user && isUnlocked && !!password,
  })

  const invalidateTrash = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trash.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })
  }

  const restoreNote = useMutation({
    mutationFn: async (id: string) => {
      const trashNotes = await fetchTrashNotesFromDb()
      const descendantIds = collectDescendantIds(id, trashNotes)
      const idsToRestore = [id, ...descendantIds]

      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: null })
        .in('id', idsToRestore)

      if (error) throw error
      return id
    },
    onSuccess: invalidateTrash,
  })

  const permanentDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(id) })
      queryClient.removeQueries({ queryKey: queryKeys.noteHistory.byNote(id) })
      invalidateTrash()
    },
  })

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    restoreNote,
    permanentDelete,
  }
}
