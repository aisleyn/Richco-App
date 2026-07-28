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
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        author,
        type,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Failed to post:', error.message)
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

    console.log('[Notifications] Posted:', title)
    return notification
  } catch (err) {
    console.error('[Notifications] Error posting:', err)
    return null
  }
}

export async function getAllNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[Notifications] Failed to fetch:', error.message)
      return []
    }

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
