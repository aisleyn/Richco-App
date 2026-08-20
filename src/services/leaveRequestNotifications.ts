// Service to handle leave request related notifications

import { notifyLeaveRequestAnswer } from './notificationSender'
import { supabase } from './supabaseAuth'

/**
 * Notify user when their leave request is approved
 */
export async function notifyLeaveRequestApproved(params: {
  userEmail: string
  startDate: string
  endDate: string
  requestId: string
}): Promise<void> {
  try {
    const dateRange = params.startDate === params.endDate
      ? params.startDate
      : `${params.startDate} to ${params.endDate}`

    await notifyLeaveRequestAnswer({
      userEmail: params.userEmail,
      status: 'approved',
      dates: dateRange,
      requestId: params.requestId,
    })

    console.log(`[LeaveNotifications] ✅ Sent approval notification to ${params.userEmail}`)
  } catch (err) {
    console.error('[LeaveNotifications] Error sending approval notification:', err)
  }
}

/**
 * Notify user when their leave request is denied
 */
export async function notifyLeaveRequestDenied(params: {
  userEmail: string
  startDate: string
  endDate: string
  requestId: string
  reason?: string
}): Promise<void> {
  try {
    const dateRange = params.startDate === params.endDate
      ? params.startDate
      : `${params.startDate} to ${params.endDate}`

    await notifyLeaveRequestAnswer({
      userEmail: params.userEmail,
      status: 'denied',
      dates: dateRange,
      requestId: params.requestId,
    })

    console.log(`[LeaveNotifications] ✅ Sent denial notification to ${params.userEmail}`)
  } catch (err) {
    console.error('[LeaveNotifications] Error sending denial notification:', err)
  }
}

/**
 * Notify admins when a new leave request is submitted
 */
export async function notifyAdminsOfLeaveRequest(params: {
  requesterName: string
  requesterEmail: string
  startDate: string
  endDate: string
  reason?: string
}): Promise<void> {
  try {
    // Get all admin emails
    const { data: admins } = await supabase
      .from('crew_members')
      .select('email')
      .eq('is_admin', true)

    if (!admins || admins.length === 0) {
      console.warn('[LeaveNotifications] No admins found')
      return
    }

    const dateRange = params.startDate === params.endDate
      ? params.startDate
      : `${params.startDate} to ${params.endDate}`

    for (const admin of admins) {
      // For now, just log - could send actual notification
      console.log(
        `[LeaveNotifications] Would notify admin ${admin.email} of leave request from ${params.requesterName}`
      )
    }
  } catch (err) {
    console.error('[LeaveNotifications] Error notifying admins:', err)
  }
}
