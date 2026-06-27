/// <reference lib="webworker" />

/** Background Sync API — not included in TypeScript's webworker lib */
interface SyncEvent extends ExtendableEvent {
  readonly tag: string
}

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import {
  OUTBOX_SYNC_TAG,
} from './lib/syncConstants'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

/** 导航请求优先走网络，避免 index.html 被旧 Service Worker 缓存 */
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'kb-pages',
    networkTimeoutSeconds: 5,
  }),
)

// Supabase 写请求不经过 Service Worker，避免 Background Sync 干扰 PATCH 响应。
// 离线写入由应用内 outbox（IndexedDB）负责。

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag !== OUTBOX_SYNC_TAG) return

  syncEvent.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'REPLAY_OUTBOX' })
        })
      }),
  )
})
