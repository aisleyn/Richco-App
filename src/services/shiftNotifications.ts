// Service to handle shift-related notifications

import { notifyShiftAlert, notifyRosterChange } from './notificationSender'
import { supabase } from './supabaseAuth'

/**
 * Check for upcoming shifts and send alerts 15 minutes before start
 * Should be called periodically (e.g., every minute) by a background task
 */
export async function checkAndSendShiftAlerts(): Promise<void> {
  try {
    const now = new Date()
    const in20Minutes = new Date(now.getTime() + 20 * 60000)

    // Get shifts starting in the next 20 minutes
    const { data: shifts, error: shiftsError } = await supabase
      .from('shift_assignments')
      .select(`
        shift_id,
        user_email,
        shifts(
          id,
          name,
          start_time,
          end_time
        )
      `)

    if (shiftsError) {
      console.error('[ShiftNotifications] Error fetching shifts:', shiftsError.message)
      return
    }

    if (!shifts || shifts.length === 0) {
      return
    }

    // Track which alerts we've already sent (by shift_id + email)
    const sentAlerts = new Set<string>()

    // Check each assignment
    for (const assignment of shifts) {
      const shift = (assignment as any).shifts
      if (!shift || !shift.start_time) continue

      const startTime = new Date(shift.start_time)
      const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / 60000)

      // Send alert if shift starts in 15-20 minutes (avoid duplicates)
      if (minutesUntilStart >= 15 && minutesUntilStart <= 20) {
        const alertKey = `${shift.id}-${assignment.user_email}`
        if (!sentAlerts.has(alertKey)) {
          sentAlerts.add(alertKey)

          try {
            const shiftDate = startTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
            const shiftTime = startTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })

            await notifyShiftAlert({
              userEmail: assignment.user_email,
              shiftName: shift.name,
              message: `Shift starts in ${minutesUntilStart} minutes at ${shiftTime}`,
              shiftId: shift.id,
              minutesUntilStart,
            })

            console.log(
              `[ShiftNotifications] ✅ Sent ${minutesUntilStart}min alert for: ${shift.name} to ${assignment.user_email}`
            )
          } catch (err) {
            console.error(
              `[ShiftNotifications] Error sending alert for ${shift.id}:`,
              err
            )
          }
        }
      }
    }
  } catch (err) {
    console.error('[ShiftNotifications] Exception checking shifts:', err)
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
