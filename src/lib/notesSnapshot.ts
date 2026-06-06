import type { Note } from '../../types/database'
import {
  requestToPromise,
  SNAPSHOT_STORE,
  withObjectStore,
} from './offlineDb'

type NotesSnapshotRecord = {
  userId: string
  notes: Note[]
  updatedAt: number
}

export async function saveNotesSnapshot(
  userId: string,
  notes: Note[],
): Promise<void> {
  const record: NotesSnapshotRecord = {
    userId,
    notes,
    updatedAt: Date.now(),
  }

  await withObjectStore(SNAPSHOT_STORE, 'readwrite', (store) =>
    requestToPromise(store.put(record)),
  )
}

export async function loadNotesSnapshot(userId: string): Promise<Note[] | null> {
  const record = await withObjectStore(
    SNAPSHOT_STORE,
    'readonly',
    (store) => requestToPromise(store.get(userId)) as Promise<NotesSnapshotRecord | undefined>,
  )

  return record?.notes ?? null
}
