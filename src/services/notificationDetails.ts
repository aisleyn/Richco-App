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
  replyToId?: string
  replyToAuthor?: string
  nestedReplies?: CommentReply[]
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
  author: string,
  replyToId?: string
): Promise<CommentReply | null> {
  try {
    const { data, error } = await supabase
      .from('notification_comment_replies')
      .insert({
        comment_id: commentId,
        reply,
        author,
        reply_to_id: replyToId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[NotificationDetails] Failed to add reply:', error.message)
      return null
    }

    // Fetch parent reply's author if this is a nested reply
    let replyToAuthor: string | undefined = undefined
    if (data.reply_to_id) {
      const parentReply = await supabase
        .from('notification_comment_replies')
        .select('author')
        .eq('id', data.reply_to_id)
        .single()

      if (parentReply.data?.author) {
        replyToAuthor = parentReply.data.author
      }
    }

    return {
      id: data.id,
      commentId: data.comment_id,
      reply: data.reply,
      author: data.author,
      createdAt: new Date(data.created_at),
      replyToId: data.reply_to_id,
      replyToAuthor: replyToAuthor,
      nestedReplies: [],
    }
  } catch (err) {
    console.error('[NotificationDetails] Error adding reply:', err)
    return null
  }
}

export async function getCommentReplies(commentId: string, parentReplyId?: string): Promise<CommentReply[]> {
  try {
    let query = supabase
      .from('notification_comment_replies')
      .select('*')
      .eq('comment_id', commentId)

    if (parentReplyId) {
      query = query.eq('reply_to_id', parentReplyId)
    } else {
      query = query.is('reply_to_id', null)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('[NotificationDetails] Failed to fetch replies:', error.message)
      return []
    }

    // Recursively fetch nested replies and parent author info
    const repliesWithNested = await Promise.all(
      (data || []).map(async (r: any) => {
        const nestedReplies = await getCommentReplies(commentId, r.id)

        // Fetch parent reply's author name if this is a nested reply
        let replyToAuthor: string | undefined = undefined
        if (r.reply_to_id) {
          const parentReply = await supabase
            .from('notification_comment_replies')
            .select('author')
            .eq('id', r.reply_to_id)
            .single()

          if (parentReply.data?.author) {
            replyToAuthor = parentReply.data.author
          }
        }

        return {
          id: r.id,
          commentId: r.comment_id,
          reply: r.reply,
          author: r.author,
          createdAt: new Date(r.created_at),
          replyToId: r.reply_to_id,
          replyToAuthor: replyToAuthor,
          nestedReplies: nestedReplies,
        }
      })
    )

    return repliesWithNested
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
    const { error } = await supabase
      .from('notification_comment_views')
      .insert({
        comment_id: commentId,
        viewed_by: viewedBy,
      })

    if (error?.code === '23505') {
      // Unique constraint - already tracked, ignore silently
      return
    }

    if (error) {
      console.error('[NotificationDetails] Failed to track comment view:', error.message)
    }
  } catch (err) {
    console.error('[NotificationDetails] Error tracking comment view:', err)
  }
}

export async function addNotificationReaction(
  notificationId: string,
  reactionType: 'like' | 'dislike' | 'question',
  reactionBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_reactions')
      .insert({
        notification_id: notificationId,
        reaction_type: reactionType,
        reaction_by: reactionBy,
      })

    if (error?.code === '23505') {
      // Reaction already exists - try to delete it (toggle off)
      await removeNotificationReaction(notificationId, reactionType, reactionBy)
      return true
    }

    if (error) {
      console.error('[NotificationDetails] Failed to add notification reaction:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[NotificationDetails] Error adding notification reaction:', err)
    return false
  }
}

export async function removeNotificationReaction(
  notificationId: string,
  reactionType: 'like' | 'dislike' | 'question',
  reactionBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_reactions')
      .delete()
      .eq('notification_id', notificationId)
      .eq('reaction_type', reactionType)
      .eq('reaction_by', reactionBy)

    if (error) {
      console.error('[NotificationDetails] Failed to remove notification reaction:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[NotificationDetails] Error removing notification reaction:', err)
    return false
  }
}

export async function getNotificationReactions(notificationId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('notification_reactions')
      .select('reaction_type, reaction_by', { count: 'exact' })
      .eq('notification_id', notificationId)

    if (error) {
      console.error('[NotificationDetails] Failed to fetch notification reactions:', error.message)
      return { like: 0, dislike: 0, question: 0 }
    }

    const counts = { like: 0, dislike: 0, question: 0 }
    data?.forEach((r: any) => {
      counts[r.reaction_type as keyof typeof counts]++
    })

    return counts
  } catch (err) {
    console.error('[NotificationDetails] Error fetching notification reactions:', err)
    return { like: 0, dislike: 0, question: 0 }
  }
}

export interface ReactionDetail {
  author: string
  reactionType: 'like' | 'dislike' | 'question'
}

export async function getCommentReactionDetails(commentId: string): Promise<ReactionDetail[]> {
  try {
    const { data, error } = await supabase
      .from('notification_comment_reactions')
      .select('reaction_by, reaction_type')
      .eq('comment_id', commentId)

    if (error) {
      console.error('[NotificationDetails] Failed to fetch comment reaction details:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      author: r.reaction_by,
      reactionType: r.reaction_type,
    }))
  } catch (err) {
    console.error('[NotificationDetails] Error fetching comment reaction details:', err)
    return []
  }
}

export async function getNotificationReactionDetails(notificationId: string): Promise<ReactionDetail[]> {
  try {
    const { data, error } = await supabase
      .from('notification_reactions')
      .select('reaction_by, reaction_type')
      .eq('notification_id', notificationId)

    if (error) {
      console.error('[NotificationDetails] Failed to fetch notification reaction details:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      author: r.reaction_by,
      reactionType: r.reaction_type,
    }))
  } catch (err) {
    console.error('[NotificationDetails] Error fetching notification reaction details:', err)
    return []
  }
}
