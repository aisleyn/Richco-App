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

export interface CommentReply {
  id: string
  commentId: string
  reply: string
  author: string
  createdAt: Date
}

export interface CommentReaction {
  id: string
  commentId: string
  reactionBy: string
  reactionType: 'like' | 'dislike' | 'question'
}

export async function addCommentReply(
  commentId: string,
  reply: string,
  author: string
): Promise<CommentReply | null> {
  try {
    const { data, error } = await supabase
      .from('notification_comment_replies')
      .insert({
        comment_id: commentId,
        reply,
        author,
      })
      .select()
      .single()

    if (error) {
      console.error('[NotificationDetails] Failed to add reply:', error.message)
      return null
    }

    return {
      id: data.id,
      commentId: data.comment_id,
      reply: data.reply,
      author: data.author,
      createdAt: new Date(data.created_at),
    }
  } catch (err) {
    console.error('[NotificationDetails] Error adding reply:', err)
    return null
  }
}

export async function getCommentReplies(commentId: string): Promise<CommentReply[]> {
  try {
    const { data, error } = await supabase
      .from('notification_comment_replies')
      .select('*')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[NotificationDetails] Failed to fetch replies:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      commentId: r.comment_id,
      reply: r.reply,
      author: r.author,
      createdAt: new Date(r.created_at),
    }))
  } catch (err) {
    console.error('[NotificationDetails] Error fetching replies:', err)
    return []
  }
}

export async function addCommentReaction(
  commentId: string,
  reactionType: 'like' | 'dislike' | 'question',
  reactionBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_comment_reactions')
      .insert({
        comment_id: commentId,
        reaction_type: reactionType,
        reaction_by: reactionBy,
      })

    if (error?.code === '23505') {
      // Reaction already exists - try to delete it (toggle off)
      await removeCommentReaction(commentId, reactionType, reactionBy)
      return true
    }

    if (error) {
      console.error('[NotificationDetails] Failed to add reaction:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[NotificationDetails] Error adding reaction:', err)
    return false
  }
}

export async function removeCommentReaction(
  commentId: string,
  reactionType: 'like' | 'dislike' | 'question',
  reactionBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_comment_reactions')
      .delete()
      .eq('comment_id', commentId)
      .eq('reaction_type', reactionType)
      .eq('reaction_by', reactionBy)

    if (error) {
      console.error('[NotificationDetails] Failed to remove reaction:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[NotificationDetails] Error removing reaction:', err)
    return false
  }
}

export async function getCommentReactions(commentId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('notification_comment_reactions')
      .select('reaction_type, reaction_by', { count: 'exact' })
      .eq('comment_id', commentId)

    if (error) {
      console.error('[NotificationDetails] Failed to fetch reactions:', error.message)
      return { like: 0, dislike: 0, question: 0 }
    }

    const counts = { like: 0, dislike: 0, question: 0 }
    data?.forEach((r: any) => {
      counts[r.reaction_type as keyof typeof counts]++
    })

    return counts
  } catch (err) {
    console.error('[NotificationDetails] Error fetching reactions:', err)
    return { like: 0, dislike: 0, question: 0 }
  }
}

export async function trackCommentView(commentId: string, viewedBy: string): Promise<void> {
  try {
    await supabase
      .from('notification_comment_views')
      .insert({
        comment_id: commentId,
        viewed_by: viewedBy,
      })
  } catch (err) {
    // Silently ignore - view already tracked or other error
    console.log('[NotificationDetails] Comment view tracked or already exists')
  }
}
