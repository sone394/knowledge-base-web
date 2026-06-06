import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { generateSummaryAndTags } from '../lib/openai'
import { appendTagNamesToNote } from '../lib/noteTagHelpers'
import { decryptNote } from '../lib/noteCrypto'
import { useEncryption } from '../context/EncryptionContext'
import { useAuth } from '../context/AuthContext'
import { isOnline } from '../lib/network'
import {
  getNoteFromLocalCache,
  patchNotesTreeCache,
  updateNoteWrite,
} from '../lib/noteWrites'
import { syncNoteLinks } from '../lib/noteLinks'
import { meetsMinLengthForAi } from '../lib/noteText'
import { saveNotesSnapshot } from '../lib/notesSnapshot'
import type { Note, NoteUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'

const DEFAULT_DEBOUNCE_MS = 800

async function fetchNoteFromDb(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data
}

async function saveNoteToDb(id: string, updates: NoteUpdate): Promise<Note> {
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
  const { user } = useAuth()
  const { password, isUnlocked } = useEncryption()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<NoteUpdate | null>(null)
  const aiGenerationRef = useRef(0)
  const [isOfflinePending, setIsOfflinePending] = useState(false)

  const query = useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: async () => {
      if (!password) throw new Error('未解锁知识库')

      if (!isOnline()) {
        const cached = getNoteFromLocalCache(queryClient, noteId!)
        if (cached) return cached
        throw new Error('离线无法加载该笔记')
      }

      const raw = await fetchNoteFromDb(noteId!)
      return decryptNote(raw, password)
    },
    enabled: !!noteId && isUnlocked && !!password,
    networkMode: 'offlineFirst',
  })

  const [title, setTitleState] = useState('')
  const [content, setContentState] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<Error | null>(null)

  useEffect(() => {
    if (query.data && noteId === query.data.id) {
      setTitleState(query.data.title)
      setContentState(query.data.content)
      setIsDirty(false)
      setIsOfflinePending(false)
    }
  }, [noteId, query.data?.id, query.data?.title, query.data?.content])

  useEffect(() => {
    const note = query.data
    if (!note || note.id !== noteId || !isOnline()) return

    void syncNoteLinks(note.id, note.user_id, note.content)
      .then((targetIds) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.backlinks.byNote(note.id),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.graph.all })
        for (const targetId of targetIds) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.backlinks.byNote(targetId),
          })
        }
      })
      .catch((err) => {
        console.error('同步笔记链接失败', err)
      })
  }, [noteId, query.data?.id, query.data?.content, queryClient])

  const persistSnapshot = useCallback(() => {
    if (!user) return
    const notes = queryClient.getQueryData<Note[]>(queryKeys.notes.tree())
    if (notes) {
      void saveNotesSnapshot(user.id, notes)
    }
  }, [queryClient, user])

  const runAiSummaryAndTags = useCallback(
    async (targetNoteId: string, contentText: string, userId: string) => {
      if (!isOnline()) return

      const generation = ++aiGenerationRef.current
      setIsGeneratingSummary(true)
      setSummaryError(null)

      try {
        const { summary, tags } = await generateSummaryAndTags(contentText)
        if (generation !== aiGenerationRef.current) return

        const updated = await saveNoteToDb(targetNoteId, { summary })
        const decrypted = decryptNote(updated, password!)
        queryClient.setQueryData(queryKeys.notes.detail(targetNoteId), decrypted)
        patchNotesTreeCache(queryClient, (notes) =>
          notes.map((note) =>
            note.id === targetNoteId
              ? { ...note, summary: decrypted.summary }
              : note,
          ),
        )
        persistSnapshot()

        await appendTagNamesToNote(targetNoteId, userId, tags)
        queryClient.invalidateQueries({
          queryKey: queryKeys.noteTags.byNote(targetNoteId),
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
      } catch (err) {
        if (generation === aiGenerationRef.current) {
          setSummaryError(
            err instanceof Error ? err : new Error('AI 生成失败'),
          )
        }
      } finally {
        if (generation === aiGenerationRef.current) {
          setIsGeneratingSummary(false)
        }
      }
    },
    [password, queryClient, persistSnapshot],
  )

  const saveMutation = useMutation({
    mutationFn: async (updates: NoteUpdate) => {
      if (!password || !noteId) throw new Error('未解锁知识库')

      const current =
        queryClient.getQueryData<Note>(queryKeys.notes.detail(noteId)) ??
        getNoteFromLocalCache(queryClient, noteId)

      if (!current) throw new Error('笔记未加载')

      const hasContentChange = updates.content !== undefined
      const hasTitleChange = updates.title !== undefined

      if (
        isOnline() &&
        (hasContentChange || hasTitleChange)
      ) {
        const { data: currentRaw, error: currentError } = await supabase
          .from('notes')
          .select('title, content')
          .eq('id', noteId)
          .single()

        if (currentError) throw currentError

        const { error: historyError } = await supabase
          .from('note_history')
          .insert({
            note_id: noteId,
            title: currentRaw.title,
            content: currentRaw.content,
          })

        if (historyError) throw historyError
      }

      const result = await updateNoteWrite(noteId, updates, password, current)
      return { ...result, updates }
    },
    onSuccess: ({ data, offline, updates }) => {
      queryClient.setQueryData(queryKeys.notes.detail(data.id), data)
      patchNotesTreeCache(queryClient, (notes) =>
        notes.map((note) => (note.id === data.id ? data : note)),
      )
      persistSnapshot()
      setIsDirty(false)
      setIsOfflinePending(offline)

      if (!offline) {
        queryClient.invalidateQueries({ queryKey: queryKeys.notes.tree() })
        queryClient.invalidateQueries({
          queryKey: queryKeys.noteHistory.byNote(data.id),
        })
      }

      const savedContent = updates.content ?? data.content

      if (!offline && updates.content !== undefined && isOnline()) {
        void syncNoteLinks(data.id, data.user_id, savedContent)
          .then((targetIds) => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.backlinks.byNote(data.id),
            })
            queryClient.invalidateQueries({ queryKey: queryKeys.graph.all })
            for (const targetId of targetIds) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.backlinks.byNote(targetId),
              })
            }
          })
          .catch((err) => {
            console.error('同步笔记链接失败', err)
          })
      }

      if (
        !offline &&
        updates.content !== undefined &&
        !data.summary &&
        meetsMinLengthForAi(savedContent)
      ) {
        void runAiSummaryAndTags(data.id, savedContent, data.user_id)
      }
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

  const regenerateSummary = useCallback(() => {
    if (!noteId || !meetsMinLengthForAi(content)) return
    if (!isOnline()) return

    const userId = query.data?.user_id
    if (!userId) return

    void runAiSummaryAndTags(noteId, content, userId)
  }, [noteId, content, query.data?.user_id, runAiSummaryAndTags])

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
    isOfflinePending,
    saveNow,
    refetch: query.refetch,
    isGeneratingSummary,
    summaryError,
    regenerateSummary,
    canRegenerateSummary: meetsMinLengthForAi(content) && isOnline(),
  }
}
