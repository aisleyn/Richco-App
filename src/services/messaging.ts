import { supabase } from './supabaseAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface MessageThread {
  id: string
  name: string | null
  is_group: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  last_message_at: string | null
  participants?: ThreadParticipant[]
  lastMessage?: Message
  unreadCount?: number
}

export interface ThreadParticipant {
  id: string
  thread_id: string
  user_id: string
  email: string
  joined_at: string
  last_read_at: string | null
}

export interface Message {
  id: string
  thread_id: string
  sender_id: string
  sender_email: string
  sender_name: string | null
  content: string
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

// ============================================================================
// GET CONVERSATIONS
// ============================================================================

/**
 * Get all conversations for the current user
 * Sorted by most recent message
 */
export async function getConversations(userEmail: string): Promise<MessageThread[]> {
  try {
    console.log('[Messaging] Fetching conversations for:', userEmail)

    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        thread_participants (
          id,
          user_id,
          email,
          joined_at,
          last_read_at
        ),
        messages (
          id,
          thread_id,
          sender_id,
          sender_email,
          sender_name,
          content,
          created_at
        )
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[Messaging] Error fetching conversations:', error.message)
      return []
    }

    if (!data) {
      return []
    }

    // Filter to only threads where user is a participant
    const userConversations = data.filter(thread => {
      return (thread.thread_participants as any[]).some(p => p.email === userEmail)
    })

    // Add unread count and last message to each thread
    const enriched = userConversations.map(thread => {
      const messages = (thread.messages as any[]) || []
      const lastMessage = messages[messages.length - 1] || null

      // Get participant's last_read_at
      const participant = (thread.thread_participants as any[]).find(p => p.email === userEmail)
      const lastReadAt = participant?.last_read_at ? new Date(participant.last_read_at) : null

      // Count unread messages
      const unreadCount = messages.filter(msg => {
        const msgTime = new Date(msg.created_at)
        return !lastReadAt || msgTime > lastReadAt
      }).length

      return {
        ...thread,
        lastMessage,
        unreadCount,
        participants: thread.thread_participants
      }
    })

    console.log('[Messaging] ✅ Fetched', enriched.length, 'conversations')
    return enriched
  } catch (err) {
    console.error('[Messaging] Exception fetching conversations:', err)
    return []
  }
}

// ============================================================================
// GET MESSAGES IN THREAD
// ============================================================================

/**
 * Get all messages in a thread
 */
export async function getThreadMessages(threadId: string): Promise<Message[]> {
  try {
    console.log('[Messaging] Fetching messages for thread:', threadId)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Messaging] Error fetching messages:', error.message)
      return []
    }

    console.log('[Messaging] ✅ Fetched', data?.length || 0, 'messages')
    return data || []
  } catch (err) {
    console.error('[Messaging] Exception fetching messages:', err)
    return []
  }
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

/**
 * Send a message to a thread
 */
export async function sendMessage(
  threadId: string,
  content: string,
  senderEmail: string,
  senderName: string
): Promise<Message | null> {
  try {
    if (!content.trim()) {
      console.warn('[Messaging] Cannot send empty message')
      return null
    }

    console.log('[Messaging] Sending message to thread:', threadId)

    const { data: authData } = await supabase.auth.getSession()
    const userId = authData?.session?.user?.id

    if (!userId) {
      console.error('[Messaging] User not authenticated')
      return null
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: userId,
        sender_email: senderEmail,
        sender_name: senderName,
        content: content.trim()
      })
      .select()
      .single()

    if (messageError) {
      console.error('[Messaging] Error sending message:', messageError.message)
      return null
    }

    // Update thread's last_message_at
    const { error: updateError } = await supabase
      .from('message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId)

    if (updateError) {
      console.warn('[Messaging] Error updating thread timestamp:', updateError.message)
    }

    console.log('[Messaging] ✅ Message sent:', message.id)
    return message
  } catch (err) {
    console.error('[Messaging] Exception sending message:', err)
    return null
  }
}

// ============================================================================
// CREATE THREAD (1-to-1 or GROUP)
// ============================================================================

/**
 * Create a direct message thread with another user
 */
export async function createDirectThread(
  recipientEmail: string,
  recipientName: string,
  currentUserEmail: string,
  currentUserName: string
): Promise<MessageThread | null> {
  try {
    console.log('[Messaging] Creating DM thread with:', recipientEmail)

    const { data: authData } = await supabase.auth.getSession()
    const userId = authData?.session?.user?.id

    if (!userId) {
      console.error('[Messaging] User not authenticated')
      return null
    }

    // Check if thread already exists
    const { data: existing } = await supabase
      .from('message_threads')
      .select(`
        id,
        name,
        is_group,
        thread_participants(email)
      `)
      .eq('is_group', false)

    if (existing) {
      for (const thread of existing) {
        const emails = (thread.thread_participants as any[]).map(p => p.email)
        if (emails.includes(currentUserEmail) && emails.includes(recipientEmail)) {
          console.log('[Messaging] ✅ Existing thread found:', thread.id)
          return thread as unknown as MessageThread
        }
      }
    }

    // Create new thread
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        is_group: false,
        created_by: userId
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error('[Messaging] Error creating thread:', threadError?.message)
      return null
    }

    // Add both participants
    const { error: participantError } = await supabase
      .from('thread_participants')
      .insert([
        {
          thread_id: thread.id,
          user_id: userId,
          email: currentUserEmail
        },
        {
          thread_id: thread.id,
          user_id: userId, // Would normally be recipient's ID, but we don't have it
          email: recipientEmail
        }
      ])

    if (participantError) {
      console.error('[Messaging] Error adding participants:', participantError.message)
      // Clean up thread if participant add fails
      await supabase.from('message_threads').delete().eq('id', thread.id)
      return null
    }

    console.log('[Messaging] ✅ Thread created:', thread.id)
    return { ...thread, participants: [] }
  } catch (err) {
    console.error('[Messaging] Exception creating thread:', err)
    return null
  }
}

/**
 * Create a group chat thread
 */
export async function createGroupThread(
  groupName: string,
  memberEmails: string[],
  currentUserEmail: string
): Promise<MessageThread | null> {
  try {
    console.log('[Messaging] Creating group thread:', groupName)

    const { data: authData } = await supabase.auth.getSession()
    const userId = authData?.session?.user?.id

    if (!userId) {
      console.error('[Messaging] User not authenticated')
      return null
    }

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        name: groupName,
        is_group: true,
        created_by: userId
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error('[Messaging] Error creating group thread:', threadError?.message)
      return null
    }

    // Add participants (including current user)
    const allEmails = [...new Set([currentUserEmail, ...memberEmails])]
    const participants = allEmails.map(email => ({
      thread_id: thread.id,
      user_id: userId,
      email
    }))

    const { error: participantError } = await supabase
      .from('thread_participants')
      .insert(participants)

    if (participantError) {
      console.error('[Messaging] Error adding participants:', participantError.message)
      await supabase.from('message_threads').delete().eq('id', thread.id)
      return null
    }

    console.log('[Messaging] ✅ Group thread created:', thread.id)
    return { ...thread, participants: [] }
  } catch (err) {
    console.error('[Messaging] Exception creating group thread:', err)
    return null
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

let messageChannel: RealtimeChannel | null = null

/**
 * Subscribe to messages in a thread
 */
export function subscribeToThreadMessages(
  threadId: string,
  onNewMessage: (message: Message) => void
): (() => void) {
  console.log('[Messaging] Subscribing to thread:', threadId)

  messageChannel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      },
      (payload) => {
        console.log('[Messaging] 📨 New message received:', payload.new)
        onNewMessage(payload.new as Message)
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    if (messageChannel) {
      console.log('[Messaging] Unsubscribing from thread:', threadId)
      supabase.removeChannel(messageChannel)
      messageChannel = null
    }
  }
}

/**
 * Subscribe to thread list changes
 */
export function subscribeToConversations(
  userEmail: string,
  onThreadUpdate: (thread: MessageThread) => void
): (() => void) {
  console.log('[Messaging] Subscribing to conversations for:', userEmail)

  const channel = supabase
    .channel(`conversations:${userEmail}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_threads'
      },
      (payload) => {
        console.log('[Messaging] 💬 New thread:', payload.new)
        onThreadUpdate(payload.new as MessageThread)
      }
    )
    .subscribe()

  return () => {
    console.log('[Messaging] Unsubscribing from conversations')
    supabase.removeChannel(channel)
  }
}

// ============================================================================
// MARK AS READ
// ============================================================================

/**
 * Mark all messages in a thread as read
 */
export async function markThreadAsRead(
  threadId: string,
  userEmail: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('email', userEmail)

    if (error) {
      console.error('[Messaging] Error marking thread as read:', error.message)
      return false
    }

    console.log('[Messaging] ✅ Thread marked as read:', threadId)
    return true
  } catch (err) {
    console.error('[Messaging] Exception marking thread as read:', err)
    return false
  }
}

// ============================================================================
// GET CREW EMAILS FOR INVITES
// ============================================================================

/**
 * Get all crew members' emails for group chat invites
 */
export async function getCrewEmails(): Promise<Array<{ email: string; name: string }>> {
  try {
    console.log('[Messaging] Fetching crew members for DM list')
    const { data, error } = await supabase
      .from('crew_members')
      .select('email, first_name, last_name')
      .order('first_name', { ascending: true })

    if (error) {
      console.error('[Messaging] Error fetching crew:', error.message)
      return []
    }

    const result = (data || []).map(member => ({
      email: member.email,
      name: `${member.first_name} ${member.last_name}`
    }))

    console.log('[Messaging] ✅ Fetched', result.length, 'crew members:', result.map(r => r.email).join(', '))
    return result
  } catch (err) {
    console.error('[Messaging] Exception fetching crew:', err)
    return []
  }
}
