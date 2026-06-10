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
import { isOnline, withTimeout } from '../lib/network'
import {
  getNoteFromLocalCache,
  patchNotesTreeCache,
  updateNoteWrite,
} from '../lib/noteWrites'
import { syncNoteLinks } from '../lib/noteLinks'
import { meetsMinLengthForAi } from '../lib/noteText'
import { loadNotesSnapshot, saveNotesSnapshot } from '../lib/notesSnapshot'
import type { Note, NoteUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'

const DEFAULT_DEBOUNCE_MS = 800
const NOTE_FETCH_TIMEOUT_MS = 20_000

async function fetchNoteFromDb(id: string): Promise<Note> {
  const { data, error } = await withTimeout(
    supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    NOTE_FETCH_TIMEOUT_MS,
    '加载笔记超时，请检查网络后刷新',
  )

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
  const pendingNoteIdRef = useRef<string | null>(null)
  const aiGenerationRef = useRef(0)
  const [isOfflinePending, setIsOfflinePending] = useState(false)

  // 笔记树或 IndexedDB 快照中有数据时，先展示本地内容，避免长时间骨架屏
  useEffect(() => {
    if (!noteId || !isUnlocked || !password) return

    const existing = queryClient.getQueryData<Note>(
      queryKeys.notes.detail(noteId),
    )
    if (existing !== undefined) return

    const fromTree = getNoteFromLocalCache(queryClient, noteId)
    if (fromTree) {
      queryClient.setQueryData(queryKeys.notes.detail(noteId), fromTree)
      return
    }

    if (!user) return
    void loadNotesSnapshot(user.id).then((snapshot) => {
      const note = snapshot?.find((item) => item.id === noteId)
      if (!note) return
      queryClient.setQueryData<Note>(queryKeys.notes.detail(noteId), (current) =>
        current === undefined ? note : current,
      )
    })
  }, [noteId, isUnlocked, password, queryClient, user])

  const query = useQuery({
    queryKey: queryKeys.notes.detail(noteId ?? ''),
    queryFn: async () => {
      if (!password) throw new Error('未解锁知识库')

      const cached = getNoteFromLocalCache(queryClient, noteId!)

      if (!isOnline()) {
        if (cached) return cached
        throw new Error('离线无法加载该笔记')
      }

      try {
        const raw = await fetchNoteFromDb(noteId!)
        return decryptNote(raw, password)
      } catch (error) {
        if (cached) return cached
        throw error
      }
    },
    enabled: !!noteId && isUnlocked && !!password,
    placeholderData: () => {
      if (!noteId) return undefined
      return getNoteFromLocalCache(queryClient, noteId) ?? undefined
    },
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
    mutationFn: async ({
      noteId: targetNoteId,
      updates,
    }: {
      noteId: string
      updates: NoteUpdate
    }) => {
      if (!password) throw new Error('未解锁知识库')

      const current =
        queryClient.getQueryData<Note>(queryKeys.notes.detail(targetNoteId)) ??
        getNoteFromLocalCache(queryClient, targetNoteId)

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
          .eq('id', targetNoteId)
          .single()

        if (currentError) throw currentError

        const { error: historyError } = await supabase
          .from('note_history')
          .insert({
            note_id: targetNoteId,
            title: currentRaw.title,
            content: currentRaw.content,
          })

        if (historyError) throw historyError
      }

      const result = await updateNoteWrite(
        targetNoteId,
        updates,
        password,
        current,
      )
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

  const applyOptimisticUpdate = useCallback(
    (targetNoteId: string, updates: NoteUpdate) => {
      const current =
        queryClient.getQueryData<Note>(queryKeys.notes.detail(targetNoteId)) ??
        getNoteFromLocalCache(queryClient, targetNoteId)
      if (!current) return

      const optimistic: Note = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      }
      queryClient.setQueryData(queryKeys.notes.detail(targetNoteId), optimistic)
      patchNotesTreeCache(queryClient, (notes) =>
        notes.map((note) => (note.id === targetNoteId ? optimistic : note)),
      )
      persistSnapshot()
    },
    [persistSnapshot, queryClient],
  )

  const flushSaveForNote = useCallback(
    (targetNoteId: string) => {
      if (pendingNoteIdRef.current !== targetNoteId || !pendingRef.current) {
        return
      }

      const updates = pendingRef.current
      pendingRef.current = null
      pendingNoteIdRef.current = null

      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      applyOptimisticUpdate(targetNoteId, updates)
      saveMutation.mutate({ noteId: targetNoteId, updates })
    },
    [applyOptimisticUpdate, saveMutation],
  )

  const flushSave = useCallback(() => {
    if (!noteId) return
    flushSaveForNote(noteId)
  }, [flushSaveForNote, noteId])

  const scheduleSave = useCallback(
    (updates: NoteUpdate) => {
      if (!noteId) return

      pendingNoteIdRef.current = noteId
      pendingRef.current = { ...pendingRef.current, ...updates }
      setIsDirty(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => flushSaveForNote(noteId), debounceMs)
    },
    [noteId, debounceMs, flushSaveForNote],
  )

  // 切换笔记或离开页面时，立即刷出防抖队列中的待保存内容
  useEffect(() => {
    return () => {
      flushSaveForNote(noteId ?? '')
    }
  }, [noteId, flushSaveForNote])

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      flushSave()
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [flushSave, isDirty])

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
    isLoading: query.isLoading && query.data === undefined,
    isFetching: query.isFetching,
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
