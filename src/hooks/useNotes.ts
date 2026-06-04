import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Note, NoteInsert, NoteUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'
import {
  buildNoteTree,
  flattenNoteTree,
  type FlatNote,
} from './utils/noteTree'
import type { NoteTreeNode } from '../../types/database'

async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function useNotes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.notes.tree(),
    queryFn: fetchNotes,
    enabled: !!user,
  })

  const tree: NoteTreeNode[] = query.data
    ? buildNoteTree(query.data)
    : []

  const flatNotes: FlatNote[] = query.data
    ? flattenNoteTree(tree)
    : []

  const invalidateNotes = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })

  const createNote = useMutation({
    mutationFn: async (
      input: Omit<NoteInsert, 'user_id'> & { user_id?: string },
    ) => {
      if (!user) throw new Error('未登录')

      const payload: NoteInsert = {
        user_id: user.id,
        parent_id: input.parent_id ?? null,
        title: input.title ?? '',
        content: input.content ?? '',
        sort_order: input.sort_order ?? 0,
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: invalidateNotes,
  })

  const updateNote = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: NoteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notes.detail(data.id), data)
      invalidateNotes()
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(id) })
      invalidateNotes()
    },
  })

  return {
    notes: query.data ?? [],
    tree,
    flatNotes,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createNote,
    updateNote,
    deleteNote,
  }
}

export type { FlatNote, NoteTreeNode }
