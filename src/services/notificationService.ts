import { supabase } from './supabaseAuth'

export interface Notification {
  id: string
  title: string
  message: string
  author: string
  timestamp: Date
  type: 'update' | 'alert' | 'announcement'
}

export async function postNotification(
  title: string,
  message: string,
  author: string,
  type: 'update' | 'alert' | 'announcement' = 'update'
): Promise<Notification | null> {
  try {
    console.log('[Notifications] Posting notification:', { title, message, author, type })
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        author,
        type,
      })
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Supabase error:', error.code, error.message, error.details)
      return null
    }

    if (!data) {
      console.error('[Notifications] No data returned from insert')
      return null
    }

    const notification: Notification = {
      id: data.id,
      title: data.title,
      message: data.message,
      author: data.author,
      timestamp: new Date(data.created_at),
      type: data.type,
    }

    // Trigger a custom event so other tabs/windows update
    window.dispatchEvent(
      new CustomEvent('notification:posted', { detail: notification })
    )

    console.log('[Notifications] ✅ Posted successfully:', notification.id)
    return notification
  } catch (err) {
    console.error('[Notifications] Error posting:', err)
    return null
  }
}

export async function getAllNotifications(): Promise<Notification[]> {
  try {
    console.log('[Notifications] Fetching from Supabase...')
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .is('dismissed_at', null)  // Only show non-dismissed notifications in the panel
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[Notifications] Supabase error:', error.code, error.message, error.details)
      return []
    }

    console.log('[Notifications] ✅ Fetched', (data || []).length, 'notifications')
    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      author: n.author,
      timestamp: new Date(n.created_at),
      type: n.type,
    }))
  } catch (err) {
    console.error('[Notifications] Error fetching:', err)
    return []
  }
}

export async function dismissNotification(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[Notifications] Failed to dismiss:', error.message)
      return false
    }

    window.dispatchEvent(
      new CustomEvent('notification:dismissed', { detail: { id } })
    )
    console.log('[Notifications] Dismissed:', id)
    return true
  } catch (err) {
    console.error('[Notifications] Error dismissing:', err)
    return false
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Notifications] Failed to delete:', error.message)
      return false
    }

    window.dispatchEvent(
      new CustomEvent('notification:deleted', { detail: { id } })
    )
    console.log('[Notifications] Deleted:', id)
    return true
  } catch (err) {
    console.error('[Notifications] Error deleting:', err)
    return false
  }
}

export async function clearAllNotifications(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '') // Delete all rows

    if (error) {
      console.error('[Notifications] Failed to clear:', error.message)
      return false
    }

    window.dispatchEvent(new CustomEvent('notification:cleared'))
    console.log('[Notifications] Cleared all notifications')
    return true
  } catch (err) {
    console.error('[Notifications] Error clearing:', err)
    return false
  }
}

// Map notification type to alert type for display
function mapNotificationTypeToAlertType(notificationType: string): string {
  switch (notificationType) {
    case 'alert':
      return 'urgent'
    case 'announcement':
      return 'weather'
    default:
      return 'general'
  }
}

export async function getAlertsFromSupabase(): Promise<Notification[]> {
  try {
    console.log('[Notifications] Fetching alerts from Supabase...')
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      // NOTE: Fetch ALL alerts including dismissed ones for the AlertsScreen

    if (error) {
      console.error('[Notifications] Failed to fetch alerts:', error.message)
      return []
    }

    console.log('[Notifications] ✅ Fetched', (data || []).length, 'alerts')
    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      author: n.author,
      timestamp: new Date(n.created_at),
      type: n.type,
    }))
  } catch (err) {
    console.error('[Notifications] Error fetching alerts:', err)
    return []
  }
}
