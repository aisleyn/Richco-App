/// <reference lib="webworker" />

// @ts-nocheck
// This is a custom service worker that handles push notifications
// It will be used alongside the generated Workbox service worker

// Handle push notifications
self.addEventListener('push', ((event: any) => {
  console.log('[ServiceWorker] Push notification received')

  if (!event.data) {
    console.warn('[ServiceWorker] No data in push event')
    return
  }

  try {
    const data = event.data.json() as {
      title: string
      body: string
      icon?: string
      badge?: string
      tag?: string
      data?: Record<string, any>
    }

    console.log('[ServiceWorker] Notification data:', data)

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'notification',
      data: data.data || {},
      requireInteraction: false,
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
  } catch (err) {
    console.error('[ServiceWorker] Error parsing push data:', err)
    // Fallback: show raw data as notification
    event.waitUntil(self.registration.showNotification('Richco Notification', {
      body: event.data.text(),
      icon: '/icon-192.png',
    }))
  }
}) as any)

// Handle notification clicks
self.addEventListener('notificationclick', ((event: any) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag)

  event.notification.close()

  const data = event.notification.data as {
    url?: string
    screen?: string
    id?: string
  }

  // Determine where to navigate based on notification type
  let targetUrl = '/'

  if (data.url) {
    targetUrl = data.url
  } else if (data.screen) {
    targetUrl = `/?screen=${data.screen}`
    if (data.id) {
      targetUrl += `&id=${data.id}`
    }
  }

  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      // Check if app window is already open
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new window if not open
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(targetUrl)
      }
    })
  )
}) as any)

// Handle notification dismissal
self.addEventListener('notificationclose', ((event: any) => {
  console.log('[ServiceWorker] Notification dismissed:', event.notification.tag)
}) as any)

// Standard service worker fetch/install/activate
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...')
  self.skipWaiting?.()
})

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...')
  const waitUntil = (event as any).waitUntil
  if (waitUntil && (self as any).clients?.claim) {
    waitUntil((self as any).clients.claim())
  }
})
