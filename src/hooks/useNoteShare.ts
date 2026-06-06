import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { decryptNote } from '../lib/noteCrypto'
import { patchNotesTreeCache } from '../lib/noteWrites'
import { buildShareUrl, copyTextToClipboard } from '../lib/noteShare'
import { useEncryption } from '../context/EncryptionContext'
import type { Note } from '../../types/database'
import { queryKeys } from './queryKeys'

type ShareNoteInput = {
  noteId: string
  title: string
  content: string
}

async function enableNoteShare({ noteId, title, content }: ShareNoteInput) {
  const { data, error } = await supabase
    .from('notes')
    .update({
      is_shared: true,
      title,
      content,
    })
    .eq('id', noteId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function disableNoteShare(noteId: string) {
  const { data, error } = await supabase
    .from('notes')
    .update({ is_shared: false })
    .eq('id', noteId)
    .select()
    .single()

  if (error) throw error
  return data
}

function patchNoteCaches(
  queryClient: QueryClient,
  note: Note,
  password: string | null,
) {
  const decrypted = password ? decryptNote(note, password) : note
  queryClient.setQueryData(queryKeys.notes.detail(note.id), decrypted)
  patchNotesTreeCache(queryClient, (notes) =>
    notes.map((item) => (item.id === note.id ? decrypted : item)),
  )
}

export function useShareNote() {
  const queryClient = useQueryClient()
  const { password } = useEncryption()

  return useMutation({
    mutationFn: enableNoteShare,
    onSuccess: (data) => {
      patchNoteCaches(queryClient, data, password)
    },
  })
}

export function useUnshareNote() {
  const queryClient = useQueryClient()
  const { password } = useEncryption()

  return useMutation({
    mutationFn: disableNoteShare,
    onSuccess: (data) => {
      patchNoteCaches(queryClient, data, password)
    },
  })
}

export function useCreateShareLink() {
  const shareNote = useShareNote()

  return useMutation({
    mutationFn: async (input: ShareNoteInput) => {
      const note = await shareNote.mutateAsync(input)
      const url = buildShareUrl(note.id)
      await copyTextToClipboard(url)
      return { note, url }
    },
  })
}
