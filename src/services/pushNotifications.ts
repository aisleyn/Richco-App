import { supabase } from './supabaseAuth'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export interface PushSubscription {
  id: string
  endpoint: string
  auth_key: string
  p256dh_key: string
  notify_messages: boolean
  notify_mentions: boolean
  notify_shifts: boolean
  notify_roster: boolean
  notify_leave_requests: boolean
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PushNotifications] Notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    console.log('[PushNotifications] Permission already granted')
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    console.log('[PushNotifications] Permission denied')
    return 'denied'
  }

  // Ask for permission
  const permission = await Notification.requestPermission()
  console.log('[PushNotifications] Permission result:', permission)
  return permission
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(
  userEmail: string,
  userId: string
): Promise<PushSubscription | null> {
  try {
    console.log('[PushNotifications] Subscribing:', userEmail)

    if (!isPushNotificationSupported()) {
      console.warn('[PushNotifications] Push notifications not supported')
      return null
    }

    // Get service worker
    const registration = await navigator.serviceWorker.ready
    if (!registration) {
      console.error('[PushNotifications] Service worker not ready')
      return null
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    if (!subscription) {
      console.error('[PushNotifications] Failed to subscribe')
      return null
    }

    console.log('[PushNotifications] ✅ Subscribed to push')

    // Store subscription in Supabase
    const result = await storePushSubscription(userEmail, userId, subscription)
    return result
  } catch (err) {
    console.error('[PushNotifications] Error subscribing:', err)
    return null
  }
}

/**
 * Store subscription in Supabase
 */
async function storePushSubscription(
  userEmail: string,
  userId: string,
  subscription: PushSubscriptionJSON
): Promise<PushSubscription | null> {
  try {
    if (!subscription.keys) {
      console.error('[PushNotifications] No keys in subscription')
      return null
    }

    const { data, error } = await supabase
      .from('notification_subscriptions')
      .insert({
        user_id: userId,
        email: userEmail,
        endpoint: subscription.endpoint,
        auth_key: subscription.keys.auth,
        p256dh_key: subscription.keys.p256dh,
        user_agent: navigator.userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error('[PushNotifications] Error storing subscription:', error.message)
      return null
    }

    console.log('[PushNotifications] ✅ Subscription stored:', data.id)
    return data
  } catch (err) {
    console.error('[PushNotifications] Exception storing subscription:', err)
    return null
  }
}

/**
 * Get all subscriptions for current user
 */
export async function getPushSubscriptions(): Promise<PushSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[PushNotifications] Error fetching subscriptions:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[PushNotifications] Exception fetching subscriptions:', err)
    return []
  }
}

/**
 * Update notification preferences for a subscription
 */
export async function updateNotificationPreferences(
  subscriptionId: string,
  preferences: Partial<{
    notify_messages: boolean
    notify_mentions: boolean
    notify_shifts: boolean
    notify_roster: boolean
    notify_leave_requests: boolean
  }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_subscriptions')
      .update(preferences)
      .eq('id', subscriptionId)

    if (error) {
      console.error('[PushNotifications] Error updating preferences:', error.message)
      return false
    }

    console.log('[PushNotifications] ✅ Preferences updated')
    return true
  } catch (err) {
    console.error('[PushNotifications] Exception updating preferences:', err)
    return false
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPushNotifications(subscriptionId: string): Promise<boolean> {
  try {
    console.log('[PushNotifications] Unsubscribing:', subscriptionId)

    const { error } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) {
      console.error('[PushNotifications] Error unsubscribing:', error.message)
      return false
    }

    console.log('[PushNotifications] ✅ Unsubscribed')
    return true
  } catch (err) {
    console.error('[PushNotifications] Exception unsubscribing:', err)
    return false
  }
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isUserSubscribed(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) return false

    const registration = await navigator.serviceWorker.ready
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch (err) {
    console.error('[PushNotifications] Error checking subscription:', err)
    return false
  }
}
