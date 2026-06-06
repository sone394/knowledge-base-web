export const OFFLINE_DB_NAME = 'kb-offline'
export const OFFLINE_DB_VERSION = 1
export const OUTBOX_STORE = 'outbox'
export const SNAPSHOT_STORE = 'notes_snapshot'

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' })
        outbox.createIndex('createdAt', 'createdAt')
        outbox.createIndex('noteId', 'noteId')
      }

      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'userId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开 IndexedDB'))
  })
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'))
  })
}

export async function withObjectStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openOfflineDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    Promise.resolve(fn(store))
      .then(resolve)
      .catch(reject)

    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('IndexedDB 事务失败'))
    }
  })
}
