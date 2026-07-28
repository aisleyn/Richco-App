import { v4 as uuidv4 } from 'crypto'

interface Notification {
  id: string
  title: string
  message: string
  author: string
  timestamp: Date
  type: 'update' | 'alert' | 'announcement'
}

export function postNotification(
  title: string,
  message: string,
  author: string,
  type: 'update' | 'alert' | 'announcement' = 'update'
): void {
  const notification: Notification = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    message,
    author,
    timestamp: new Date(),
    type,
  }

  // Get existing notifications
  const stored = localStorage.getItem('admin_notifications')
  const notifications: Notification[] = stored ? JSON.parse(stored) : []

  // Add new notification at the top
  notifications.unshift(notification)

  // Keep only last 50 notifications
  const trimmed = notifications.slice(0, 50)

  // Save back to localStorage
  localStorage.setItem('admin_notifications', JSON.stringify(trimmed))

  // Trigger a storage event so other tabs/windows update
  window.dispatchEvent(
    new CustomEvent('notification:posted', { detail: notification })
  )

  console.log('[Notifications] Posted:', title)
}

export function getAllNotifications(): Notification[] {
  const stored = localStorage.getItem('admin_notifications')
  if (!stored) return []
  const parsed = JSON.parse(stored)
  return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
}

export function clearAllNotifications(): void {
  localStorage.removeItem('admin_notifications')
  window.dispatchEvent(new CustomEvent('notification:cleared'))
  console.log('[Notifications] Cleared all notifications')
}
