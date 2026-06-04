import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { Note, NoteUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'

const DEFAULT_DEBOUNCE_MS = 800

async function fetchNote(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

async function saveNote(id: string, updates: NoteUpdate): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export function useNoteContent(
  noteId: string | undefined,
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<NoteUpdate | null>(null)

  const query = useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: () => fetchNote(noteId!),
    enabled: !!noteId,
  })

  const [title, setTitleState] = useState('')
  const [content, setContentState] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (query.data && noteId === query.data.id) {
      setTitleState(query.data.title)
      setContentState(query.data.content)
      setIsDirty(false)
    }
  }, [noteId, query.data?.id])

  const saveMutation = useMutation({
    mutationFn: (updates: NoteUpdate) => saveNote(noteId!, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notes.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.tree() })
      setIsDirty(false)
    },
  })

  const flushSave = useCallback(() => {
    if (!noteId || !pendingRef.current) return

    const updates = pendingRef.current
    pendingRef.current = null
    saveMutation.mutate(updates)
  }, [noteId, saveMutation])

  const scheduleSave = useCallback(
    (updates: NoteUpdate) => {
      if (!noteId) return

      pendingRef.current = { ...pendingRef.current, ...updates }
      setIsDirty(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flushSave, debounceMs)
    },
    [noteId, debounceMs, flushSave],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const setTitle = useCallback(
    (value: string) => {
      setTitleState(value)
      scheduleSave({ title: value })
    },
    [scheduleSave],
  )

  const setContent = useCallback(
    (value: string) => {
      setContentState(value)
      scheduleSave({ content: value })
    },
    [scheduleSave],
  )

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    flushSave()
  }, [flushSave])

  return {
    note: query.data,
    title,
    content,
    setTitle,
    setContent,
    isDirty,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    saveNow,
    refetch: query.refetch,
  }
}
