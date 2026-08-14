import { supabase } from './supabase'
import { useAppStore } from '../store/appStore'

/**
 * Real-time clock synchronization service
 * Syncs clock-in/out status across all devices/tabs
 */

let unsubscribe: (() => void) | null = null

/**
 * Start listening for clock state changes in Supabase
 * Updates all devices when clock status changes
 */
export function startClockSync(userId: string, userEmail: string) {
  if (!userId) return

  console.log('[ClockSync] Starting real-time listener for user:', userId)

  // Listen to time_entries table for this user
  const subscription = supabase
    .from('time_entries')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `employee_id=eq.${userId}`,
      },
      (payload: any) => {
        console.log('[ClockSync] Received update:', payload.eventType, payload.new)
        handleClockStateChange(payload)
      }
    )
    .subscribe((status: string) => {
      console.log('[ClockSync] Subscription status:', status)
    })

  unsubscribe = () => subscription.unsubscribe()
}

/**
 * Process clock state changes from Supabase
 * Layer 2: Sync across devices
 */
function handleClockStateChange(payload: any) {
  const store = useAppStore.getState()
  const { new: newRecord, old: oldRecord, eventType } = payload

  try {
    if (eventType === 'INSERT') {
      // New clock-in entry created on another device
      console.log('[ClockSync] New clock-in detected on another device')
      if (newRecord && !newRecord.clock_out_time) {
        store.syncClockState(newRecord)
        broadcastClockState(true, newRecord)
      }
    } else if (eventType === 'UPDATE') {
      // Clock-out happened on another device
      if (oldRecord && !oldRecord.clock_out_time && newRecord && newRecord.clock_out_time) {
        console.log('[ClockSync] Clock-out detected on another device')
        store.syncClockState(null)
        broadcastClockState(false, null)
      }
    }
  } catch (err) {
    console.error('[ClockSync] Error handling clock state change:', err)
  }
}

/**
 * Layer 3: Broadcast to other tabs in same browser
 * Uses BroadcastChannel for instant cross-tab sync
 */
let broadcastChannel: BroadcastChannel | null = null

export function initBroadcastChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    console.warn('[ClockSync] BroadcastChannel not supported in this browser')
    return
  }

  try {
    broadcastChannel = new BroadcastChannel('richco-clock-sync')
    broadcastChannel.onmessage = (event: MessageEvent) => {
      console.log('[ClockSync] Received message from another tab:', event.data)
      if (event.data.type === 'CLOCK_STATE_CHANGE') {
        const store = useAppStore.getState()
        if (event.data.clockedIn) {
          store.syncClockState(event.data.timeEntry)
        } else {
          store.syncClockState(null)
        }
      }
    }
  } catch (err) {
    console.warn('[ClockSync] Failed to initialize BroadcastChannel:', err)
  }
}

function broadcastClockState(clockedIn: boolean, timeEntry: any) {
  if (!broadcastChannel) return

  try {
    broadcastChannel.postMessage({
      type: 'CLOCK_STATE_CHANGE',
      clockedIn,
      timeEntry,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('[ClockSync] Failed to broadcast clock state:', err)
  }
}

export function stopClockSync() {
  if (unsubscribe) {
    console.log('[ClockSync] Stopping real-time listener')
    unsubscribe()
    unsubscribe = null
  }
  if (broadcastChannel) {
    broadcastChannel.close()
    broadcastChannel = null
  }
}

/**
 * Check if user is currently clocked in on ANY device
 * Prevents duplicate clock-ins
 */
export async function checkActiveClockIn(userId: string) {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, employee_id, clock_in_time, clock_out_time')
      .eq('employee_id', userId)
      .is('clock_out_time', null)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is expected)
      console.error('[ClockSync] Error checking active clock-in:', error)
      return null
    }

    return data || null
  } catch (err) {
    console.error('[ClockSync] Unexpected error checking active clock-in:', err)
    return null
  }
}

/**
 * Prevent duplicate clock-ins
 * Call this before allowing user to clock in
 */
export async function validateClockInAllowed(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const activeEntry = await checkActiveClockIn(userId)

    if (activeEntry) {
      const clockInTime = new Date(activeEntry.clock_in_time).toLocaleTimeString()
      return {
        allowed: false,
        reason: `Already clocked in since ${clockInTime}. Please clock out first.`,
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('[ClockSync] Error validating clock-in:', err)
    // Allow clock-in if we can't verify (assume offline or temporary error)
    return { allowed: true }
  }
}
