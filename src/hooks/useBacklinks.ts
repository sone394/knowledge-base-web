import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { NoteBacklink } from '../../types/database'
import { queryKeys } from './queryKeys'

async function fetchBacklinks(noteId: string): Promise<NoteBacklink[]> {
  const { data, error } = await supabase
    .from('note_backlinks')
    .select('*')
    .eq('note_id', noteId)
    .order('link_created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export function useBacklinks(noteId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.backlinks.byNote(noteId ?? ''),
    queryFn: () => fetchBacklinks(noteId!),
    enabled: !!noteId,
  })

  return {
    backlinks: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
