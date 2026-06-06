import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import { decryptNote, decryptNotes } from '../lib/noteCrypto'
import { searchNotesRpc } from '../lib/noteSearch'
import { isOnline } from '../lib/network'
import {
  createNoteWrite,
  deleteNoteWrite,
  patchNotesTreeCache,
  updateNoteWrite,
} from '../lib/noteWrites'
import {
  loadNotesSnapshot,
  saveNotesSnapshot,
} from '../lib/notesSnapshot'
import type { Note, NoteInsert, NoteSearchResult, NoteUpdate } from '../../types/database'
import { queryKeys } from './queryKeys'
import {
  buildNoteTree,
  flattenNoteTree,
  type FlatNote,
} from './utils/noteTree'
import type { NoteTreeNode } from '../../types/database'

async function fetchNotesFromDb(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

function removeNoteSubtree(notes: Note[], rootId: string): Note[] {
  const toRemove = new Set<string>()

  const collect = (id: string) => {
    toRemove.add(id)
    notes
      .filter((note) => note.parent_id === id)
      .forEach((note) => collect(note.id))
  }

  collect(rootId)
  return notes.filter((note) => !toRemove.has(note.id))
}

const SEARCH_RESULT_LIMIT = 30
const TITLE_MATCH_RANK = 10
const CONTENT_MATCH_RANK = 5

/** 在本地解密缓存中搜索（支持加密正文的客户端全文检索） */
function searchNotesClient(cached: Note[], query: string): NoteSearchResult[] {
  const q = query.toLowerCase()

  return cached
    .map((note) => {
      const titleMatch = note.title.toLowerCase().includes(q)
      const contentMatch = note.content.toLowerCase().includes(q)
      if (!titleMatch && !contentMatch) return null

      let rank = 0
      if (titleMatch) rank += TITLE_MATCH_RANK
      if (contentMatch) rank += CONTENT_MATCH_RANK

      return { ...note, rank }
    })
    .filter((note): note is NoteSearchResult => note !== null)
    .sort((a, b) => b.rank - a.rank || b.updated_at.localeCompare(a.updated_at))
    .slice(0, SEARCH_RESULT_LIMIT)
}

/** 通过 Supabase RPC 全文搜索笔记（在线），离线时回退本地缓存 */
export function useNoteSearch(query: string) {
  const { user } = useAuth()
  const { password, isUnlocked } = useEncryption()
  const queryClient = useQueryClient()
  const trimmed = query.trim()

  const searchQuery = useQuery({
    queryKey: queryKeys.notes.search(trimmed),
    queryFn: async (): Promise<NoteSearchResult[]> => {
      if (!password || !user) throw new Error('未解锁知识库')
      if (!trimmed) return []

      const cached =
        queryClient.getQueryData<Note[]>(queryKeys.notes.tree()) ??
        (await loadNotesSnapshot(user.id))

      if (cached?.length) {
        return searchNotesClient(cached, trimmed)
      }

      if (!isOnline()) {
        return []
      }

      const raw = await searchNotesRpc(trimmed)
      return raw
        .map((row) => ({
          ...decryptNote(row, password),
          rank: row.rank,
        }))
        .slice(0, SEARCH_RESULT_LIMIT)
    },
    enabled: !!user && isUnlocked && !!password && trimmed.length > 0,
    staleTime: 30_000,
    networkMode: 'offlineFirst',
  })

  return {
    results: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
  }
}

export function useNotes() {
  const { user } = useAuth()
  const { password, isUnlocked } = useEncryption()
  const queryClient = useQueryClient()

  const persistSnapshot = (notes: Note[]) => {
    if (user) {
      void saveNotesSnapshot(user.id, notes)
    }
  }

  const query = useQuery({
    queryKey: queryKeys.notes.tree(),
    queryFn: async () => {
      if (!password || !user) throw new Error('未解锁知识库')

      if (!isOnline()) {
        const cached = await loadNotesSnapshot(user.id)
        if (cached) return cached
        throw new Error('离线且无本地缓存，请先联网加载笔记')
      }

      try {
        const raw = await fetchNotesFromDb()
        const decrypted = decryptNotes(raw, password)
        await saveNotesSnapshot(user.id, decrypted)
        return decrypted
      } catch (error) {
        const cached = await loadNotesSnapshot(user.id)
        if (cached) return cached
        throw error
      }
    },
    enabled: !!user && isUnlocked && !!password,
    networkMode: 'offlineFirst',
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
      if (!password) throw new Error('未解锁知识库')

      const payload: NoteInsert = {
        user_id: user.id,
        parent_id: input.parent_id ?? null,
        title: input.title ?? '',
        content: input.content ?? '',
        sort_order: input.sort_order ?? 0,
      }

      const { data, offline } = await createNoteWrite(
        payload,
        password,
        input.content ?? '',
      )
      return { data, offline }
    },
    onSuccess: ({ data, offline }) => {
      patchNotesTreeCache(queryClient, (notes) => {
        if (notes.some((note) => note.id === data.id)) {
          return notes.map((note) => (note.id === data.id ? data : note))
        }
        return [...notes, data]
      })

      const notes = queryClient.getQueryData<Note[]>(queryKeys.notes.tree())
      if (notes) persistSnapshot(notes)

      if (!offline) {
        invalidateNotes()
      }
    },
  })

  const updateNote = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: NoteUpdate & { id: string }) => {
      if (!password) throw new Error('未解锁知识库')

      const notes =
        queryClient.getQueryData<Note[]>(queryKeys.notes.tree()) ?? []
      const current = notes.find((note) => note.id === id)
      if (!current) throw new Error('笔记不存在')

      const result = await updateNoteWrite(id, updates, password, current)
      return result
    },
    onSuccess: ({ data, offline }) => {
      queryClient.setQueryData(queryKeys.notes.detail(data.id), data)
      patchNotesTreeCache(queryClient, (notes) =>
        notes.map((note) => (note.id === data.id ? data : note)),
      )

      const notes = queryClient.getQueryData<Note[]>(queryKeys.notes.tree())
      if (notes) persistSnapshot(notes)

      if (!offline) {
        invalidateNotes()
      }
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const notes =
        queryClient.getQueryData<Note[]>(queryKeys.notes.tree()) ?? []
      return deleteNoteWrite(id, notes)
    },
    onSuccess: ({ data: id, offline }) => {
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(id) })
      patchNotesTreeCache(queryClient, (notes) => removeNoteSubtree(notes, id))

      const notes = queryClient.getQueryData<Note[]>(queryKeys.notes.tree())
      if (notes) persistSnapshot(notes)

      if (!offline) {
        invalidateNotes()
        queryClient.invalidateQueries({ queryKey: queryKeys.trash.all })
      }
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

export type { FlatNote, NoteSearchResult, NoteTreeNode }
