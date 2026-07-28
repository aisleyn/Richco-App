import { supabase } from './supabaseAuth'

export interface NotificationComment {
  id: string
  notificationId: string
  comment: string
  author: string
  createdAt: Date
}

export async function trackNotificationView(notificationId: string, viewedBy: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications_views')
      .insert({
        notification_id: notificationId,
        viewed_by: viewedBy,
      })

    // Ignore unique constraint violations (user already viewed)
    if (error?.code === '23505') {
      console.log('[NotificationDetails] View already tracked for this user')
      return
    }

    if (error) {
      console.error('[NotificationDetails] Failed to track view:', error.message)
      return
    }

    console.log('[NotificationDetails] View tracked for notification:', notificationId)
  } catch (err) {
    console.error('[NotificationDetails] Error tracking view:', err)
  }
}

export async function getNotificationViews(notificationId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications_views')
      .select('*', { count: 'exact', head: true })
      .eq('notification_id', notificationId)

    if (error) {
      console.error('[NotificationDetails] Failed to get view count:', error.message)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('[NotificationDetails] Error getting view count:', err)
    return 0
  }
}

export async function getNotificationViewers(notificationId: string): Promise<{ email: string; viewedAt: Date }[]> {
  try {
    const { data, error } = await supabase
      .from('notifications_views')
      .select('viewed_by, viewed_at')
      .eq('notification_id', notificationId)
      .order('viewed_at', { ascending: false })

    if (error) {
      console.error('[NotificationDetails] Failed to get viewers:', error.message)
      return []
    }

    return (data || []).map((v: any) => ({
      email: v.viewed_by,
      viewedAt: new Date(v.viewed_at),
    }))
  } catch (err) {
    console.error('[NotificationDetails] Error getting viewers:', err)
    return []
  }
}

export async function getNotificationComments(notificationId: string): Promise<NotificationComment[]> {
  try {
    const { data, error } = await supabase
      .from('notifications_comments')
      .select('*')
      .eq('notification_id', notificationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[NotificationDetails] Failed to fetch comments:', error.message)
      return []
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      notificationId: c.notification_id,
      comment: c.comment,
      author: c.author,
      createdAt: new Date(c.created_at),
    }))
  } catch (err) {
    console.error('[NotificationDetails] Error fetching comments:', err)
    return []
  }
}

export async function addNotificationComment(
  notificationId: string,
  comment: string,
  author: string
): Promise<NotificationComment | null> {
  try {
    console.log('[NotificationDetails] Adding comment to notification:', notificationId)
    const { data, error } = await supabase
      .from('notifications_comments')
      .insert({
        notification_id: notificationId,
        comment,
        author,
      })
      .select()
      .single()

    if (error) {
      console.error('[NotificationDetails] Failed to add comment:', error.message)
      return null
    }

    const newComment: NotificationComment = {
      id: data.id,
      notificationId: data.notification_id,
      comment: data.comment,
      author: data.author,
      createdAt: new Date(data.created_at),
    }

    console.log('[NotificationDetails] ✅ Comment added:', newComment.id)
    return newComment
  } catch (err) {
    console.error('[NotificationDetails] Error adding comment:', err)
    return null
  }
}
