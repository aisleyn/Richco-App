// Service to handle shift-related notifications

import { notifyShiftAlert, notifyRosterChange } from './notificationSender'
import { supabase } from './supabaseAuth'

/**
 * Schedule shift start alerts for all assigned users
 * Should be called periodically (e.g., every minute) by a background task
 */
export async function checkAndSendShiftAlerts(): Promise<void> {
  try {
    console.log('[ShiftNotifications] Checking for upcoming shifts...')

    // Get shifts starting in the next 20 minutes
    const now = new Date()
    const in20Minutes = new Date(now.getTime() + 20 * 60000)

    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, name, start_time, shift_assignments(user_email)')
      .gte('start_time', now.toISOString())
      .lte('start_time', in20Minutes.toISOString())

    if (shiftsError) {
      console.error('[ShiftNotifications] Error fetching shifts:', shiftsError.message)
      return
    }

    if (!shifts || shifts.length === 0) {
      console.log('[ShiftNotifications] No upcoming shifts')
      return
    }

    // Send notifications
    for (const shift of shifts) {
      const assignments = (shift.shift_assignments as any[]) || []
      const startTime = new Date(shift.start_time)
      const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / 60000)

      for (const assignment of assignments) {
        await notifyShiftAlert({
          userEmail: assignment.user_email,
          shiftName: shift.name,
          message: `Shift starts at ${startTime.toLocaleTimeString()}`,
          shiftId: shift.id,
          minutesUntilStart,
        })
      }

      console.log(
        `[ShiftNotifications] ✅ Sent alerts for shift: ${shift.name} (${minutesUntilStart}min)`
      )
    }
  } catch (err) {
    console.error('[ShiftNotifications] Exception:', err)
  }
}

/**
 * Notify users when they're added to a shift
 */
export async function notifyShiftAssignment(params: {
  userEmail: string
  shiftName: string
  date: string
  startTime: string
}): Promise<void> {
  try {
    await notifyRosterChange({
      userEmail: params.userEmail,
      message: `${params.shiftName} on ${params.date} at ${params.startTime}`,
      changeType: 'added',
    })
  } catch (err) {
    console.error('[ShiftNotifications] Error notifying assignment:', err)
  }
}

/**
 * Notify users when they're removed from a shift
 */
export async function notifyShiftRemoval(params: {
  userEmail: string
  shiftName: string
  date: string
}): Promise<void> {
  try {
    await notifyRosterChange({
      userEmail: params.userEmail,
      message: `${params.shiftName} on ${params.date}`,
      changeType: 'removed',
    })
  } catch (err) {
    console.error('[ShiftNotifications] Error notifying removal:', err)
  }
}

/**
 * Notify users when a shift they're assigned to changes
 */
export async function notifyShiftModified(params: {
  shiftId: string
  shiftName: string
  changeDetails: string
}): Promise<void> {
  try {
    // Get all assigned users
    const { data: assignments } = await supabase
      .from('shift_assignments')
      .select('user_email')
      .eq('shift_id', params.shiftId)

    if (!assignments) return

    for (const assignment of assignments) {
      await notifyRosterChange({
        userEmail: assignment.user_email,
        message: `${params.shiftName}: ${params.changeDetails}`,
        changeType: 'modified',
      })
    }

    console.log(
      `[ShiftNotifications] ✅ Sent modification alerts for shift: ${params.shiftName}`
    )
  } catch (err) {
    console.error('[ShiftNotifications] Error notifying modification:', err)
  }
}
