import { supabase } from './supabaseClient'
import {
  OUTBOX_STORE,
  requestToPromise,
  withObjectStore,
} from './offlineDb'
import {
  OUTBOX_CHANGE_EVENT,
  OUTBOX_SYNC_TAG,
} from './syncConstants'
import { isOnline } from './network'
import type { NoteInsert, NoteUpdate } from '../../types/database'

export type OutboxOperationType = 'insert' | 'update' | 'delete'

export type OutboxEntry = {
  id: string
  createdAt: number
  type: OutboxOperationType
  noteId: string
  payload: NoteInsert | NoteUpdate | { id: string }
}

async function getAllEntries(): Promise<OutboxEntry[]> {
  return withObjectStore(OUTBOX_STORE, 'readonly', (store) =>
    requestToPromise(store.index('createdAt').getAll()),
  )
}

async function putEntry(entry: OutboxEntry): Promise<void> {
  await withObjectStore(OUTBOX_STORE, 'readwrite', (store) =>
    requestToPromise(store.put(entry)),
  )
}

async function deleteEntry(id: string): Promise<void> {
  await withObjectStore(OUTBOX_STORE, 'readwrite', (store) =>
    requestToPromise(store.delete(id)),
  )
}

async function deleteEntriesForNote(noteId: string): Promise<void> {
  const entries = await getAllEntries()
  await Promise.all(
    entries
      .filter((entry) => entry.noteId === noteId)
      .map((entry) => deleteEntry(entry.id)),
  )
}

async function notifyOutboxChange(): Promise<void> {
  const pending = await getPendingCount()
  window.dispatchEvent(
    new CustomEvent(OUTBOX_CHANGE_EVENT, { detail: { pending } }),
  )
}

export async function getPendingCount(): Promise<number> {
  const entries = await getAllEntries()
  return entries.length
}

export async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if ('sync' in registration) {
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> }
      }).sync.register(OUTBOX_SYNC_TAG)
    }
  } catch {
    // Background Sync 不可用时依赖 online 事件重放
  }
}

type EnqueueInput = {
  type: OutboxOperationType
  noteId: string
  payload: OutboxEntry['payload']
}

export async function enqueueOutbox(input: EnqueueInput): Promise<OutboxEntry> {
  if (input.type === 'delete') {
    await deleteEntriesForNote(input.noteId)
  }

  if (input.type === 'update') {
    const entries = await getAllEntries()
    const existing = entries.find(
      (entry) => entry.noteId === input.noteId && entry.type === 'update',
    )

    if (existing) {
      const merged: OutboxEntry = {
        ...existing,
        payload: {
          ...(existing.payload as NoteUpdate),
          ...(input.payload as NoteUpdate),
        },
      }
      await putEntry(merged)
      await notifyOutboxChange()
      await registerBackgroundSync()
      return merged
    }
  }

  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type: input.type,
    noteId: input.noteId,
    payload: input.payload,
  }

  await putEntry(entry)
  await notifyOutboxChange()
  await registerBackgroundSync()
  return entry
}

async function replayEntry(entry: OutboxEntry): Promise<void> {
  switch (entry.type) {
    case 'insert': {
      const payload = entry.payload as NoteInsert
      const { error } = await supabase.from('notes').insert(payload)
      if (error) throw error
      return
    }
    case 'update': {
      const updates = entry.payload as NoteUpdate
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', entry.noteId)
      if (error) throw error
      return
    }
    case 'delete': {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', entry.noteId)
      if (error) throw error
    }
  }
}

let replayPromise: Promise<{ synced: number; failed: number }> | null = null

export function replayOutbox(): Promise<{ synced: number; failed: number }> {
  if (replayPromise) return replayPromise

  replayPromise = (async () => {
    if (!isOnline()) return { synced: 0, failed: 0 }

    const entries = await getAllEntries()
    let synced = 0
    let failed = 0

    for (const entry of entries) {
      try {
        await replayEntry(entry)
        await deleteEntry(entry.id)
        synced += 1
      } catch {
        failed += 1
        break
      }
    }

    await notifyOutboxChange()
    return { synced, failed }
  })().finally(() => {
    replayPromise = null
  })

  return replayPromise
}

export function initOutboxSync(onReplayComplete?: () => void): void {
  const handleReplay = () => {
    void replayOutbox().then(({ synced }) => {
      if (synced > 0) onReplayComplete?.()
    })
  }

  window.addEventListener('online', handleReplay)

  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'REPLAY_OUTBOX') {
      handleReplay()
    }
  })

  if (isOnline()) {
    handleReplay()
  }
}
