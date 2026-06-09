import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { decryptNote } from '../lib/noteCrypto'
import {
  computeNextReviewState,
  endOfLocalDay,
  getDisabledReviewState,
  getInitialReviewState,
  sortNotesByReviewDueDate,
  type ReviewRating,
} from '../lib/spacedRepetition'
import { patchNotesTreeCache } from '../lib/noteWrites'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import type { Note, ReviewLogInsert } from '../../types/database'
import { queryKeys } from './queryKeys'

function mergeReviewFields(note: Note, updates: Partial<Note>): Note {
  return {
    ...note,
    needs_review: updates.needs_review ?? note.needs_review,
    review_interval: updates.review_interval ?? note.review_interval,
    review_count: updates.review_count ?? note.review_count,
    next_review_date:
      updates.next_review_date !== undefined
        ? updates.next_review_date
        : note.next_review_date,
    updated_at: updates.updated_at ?? note.updated_at,
  }
}

function patchNoteReviewCache(queryClient: QueryClient, data: Note) {
  queryClient.setQueryData(queryKeys.notes.detail(data.id), (prev: Note | undefined) =>
    prev ? mergeReviewFields(prev, data) : prev,
  )
  patchNotesTreeCache(queryClient, (notes) =>
    notes.map((note) => (note.id === data.id ? mergeReviewFields(note, data) : note)),
  )
}

async function fetchDueReviewNotes(): Promise<Note[]> {
  const todayEnd = endOfLocalDay().toISOString()

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('needs_review', true)
    .is('deleted_at', null)
    .lte('next_review_date', todayEnd)
    .order('next_review_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function useDueReviewNotes() {
  const { password, isUnlocked } = useEncryption()

  return useQuery({
    queryKey: queryKeys.review.due,
    queryFn: async () => {
      if (!password) throw new Error('未解锁知识库')
      const notes = await fetchDueReviewNotes()
      const decrypted = notes.map((note) => decryptNote(note, password))
      return sortNotesByReviewDueDate(decrypted)
    },
    enabled: isUnlocked && !!password,
  })
}

export function useReviewCount() {
  const { data, ...rest } = useDueReviewNotes()
  return { count: data?.length ?? 0, ...rest }
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      note,
      rating,
    }: {
      note: Note
      rating: ReviewRating
    }) => {
      if (!user) throw new Error('未登录')

      const nextState = computeNextReviewState(
        note.review_interval,
        note.review_count,
        rating,
      )

      const logPayload: ReviewLogInsert = {
        note_id: note.id,
        user_id: user.id,
        rating,
      }

      const { error: logError } = await supabase
        .from('review_logs')
        .insert(logPayload)

      if (logError) throw logError

      const { data, error } = await supabase
        .from('notes')
        .update({
          review_interval: nextState.review_interval,
          review_count: nextState.review_count,
          next_review_date: nextState.next_review_date,
        })
        .eq('id', note.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.due })
      patchNoteReviewCache(queryClient, data)
    },
  })
}

export function useToggleNoteReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteId,
      enabled,
    }: {
      noteId: string
      enabled: boolean
    }) => {
      const updates = enabled ? getInitialReviewState() : getDisabledReviewState()

      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.due })
      patchNoteReviewCache(queryClient, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.tree() })
    },
  })
}
