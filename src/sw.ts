/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import {
  OUTBOX_SYNC_TAG,
  WORKBOX_WRITE_QUEUE,
} from './lib/syncConstants'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

const supabaseWriteSync = new BackgroundSyncPlugin(WORKBOX_WRITE_QUEUE, {
  maxRetentionTime: 24 * 60,
})

registerRoute(
  ({ url, request }) =>
    url.hostname.includes('supabase.co') &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [supabaseWriteSync],
  }),
)

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
