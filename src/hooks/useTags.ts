import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Tag, TagInsert, TagUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'

async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function useTags() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: fetchTags,
    enabled: !!user,
  })

  const invalidateTags = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('未登录')

      const payload: TagInsert = {
        user_id: user.id,
        name: name.trim(),
      }

      const { data, error } = await supabase
        .from('tags')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: invalidateTags,
  })

  const updateTag = useMutation({
    mutationFn: async ({ id, ...updates }: TagUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: invalidateTags,
  })

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      invalidateTags()
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })
    },
  })

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createTag,
    updateTag,
    deleteTag,
  }
}
