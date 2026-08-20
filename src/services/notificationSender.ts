// Service to trigger push notifications via Supabase Edge Function

import { supabase } from './supabaseAuth'

export interface NotificationPayload {
  to_email: string
  title: string
  body: string
  icon?: string
  tag?: 'message' | 'mention' | 'shift' | 'roster' | 'leave_request'
  screen?: string
  id?: string
}

/**
 * Send a push notification to a user
 * Calls the Supabase Edge Function which handles sending to all subscriptions
 */
export async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    console.log('[NotificationSender] Sending notification:', payload.tag, 'to', payload.to_email)

    const response = await supabase.functions.invoke('send-push-notification', {
      body: payload,
    })

    if (response.error) {
      console.error('[NotificationSender] Error sending notification:', response.error)
      return false
    }

    console.log('[NotificationSender] ✅ Notification queued:', response.data)
    return true
  } catch (err) {
    console.error('[NotificationSender] Exception:', err)
    return false
  }
}

/**
 * Send DM/Group chat notification
 */
export async function notifyNewMessage(params: {
  recipientEmail: string
  senderName: string
  messagePreview: string
  threadId: string
  isGroupChat?: boolean
}): Promise<boolean> {
  const title = params.isGroupChat ? 'Group chat message' : `Message from ${params.senderName}`

  return sendPushNotification({
    to_email: params.recipientEmail,
    title,
    body: params.messagePreview,
    tag: 'message',
    screen: 'messages',
    id: params.threadId,
  })
}

/**
 * Send mention/tag notification
 */
export async function notifyMention(params: {
  recipientEmail: string
  mentionerName: string
  context: string
  threadId?: string
}): Promise<boolean> {
  return sendPushNotification({
    to_email: params.recipientEmail,
    title: `${params.mentionerName} mentioned you`,
    body: params.context,
    tag: 'mention',
    screen: params.threadId ? 'messages' : undefined,
    id: params.threadId,
  })
}

/**
 * Send shift alert notification
 */
export async function notifyShiftAlert(params: {
  userEmail: string
  shiftName: string
  message: string
  shiftId: string
  minutesUntilStart?: number
}): Promise<boolean> {
  const title = params.minutesUntilStart
    ? `Shift starts in ${params.minutesUntilStart} minutes`
    : 'Shift started'

  return sendPushNotification({
    to_email: params.userEmail,
    title,
    body: params.shiftName,
    tag: 'shift',
    screen: 'shifts',
    id: params.shiftId,
  })
}

/**
 * Send roster change notification
 */
export async function notifyRosterChange(params: {
  userEmail: string
  message: string
  changeType: 'added' | 'removed' | 'modified'
}): Promise<boolean> {
  const titles = {
    added: 'You were added to a shift',
    removed: 'You were removed from a shift',
    modified: 'Your shift schedule changed',
  }

  return sendPushNotification({
    to_email: params.userEmail,
    title: titles[params.changeType],
    body: params.message,
    tag: 'roster',
    screen: 'shifts',
  })
}

/**
 * Send leave request answer notification
 */
export async function notifyLeaveRequestAnswer(params: {
  userEmail: string
  status: 'approved' | 'denied'
  dates: string
  requestId: string
}): Promise<boolean> {
  const titles = {
    approved: 'Leave request approved ✅',
    denied: 'Leave request denied',
  }

  return sendPushNotification({
    to_email: params.userEmail,
    title: titles[params.status],
    body: `${params.dates}`,
    tag: 'leave_request',
    screen: 'time-off',
    id: params.requestId,
  })
}

/**
 * Batch send notifications to multiple users
 */
export async function notifyMultipleUsers(
  emails: string[],
  payload: Omit<NotificationPayload, 'to_email'>
): Promise<{ sent: number; failed: number }> {
  console.log('[NotificationSender] Sending to', emails.length, 'users')

  let sent = 0
  let failed = 0

  for (const email of emails) {
    const success = await sendPushNotification({
      ...payload,
      to_email: email,
    })

    if (success) {
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}
