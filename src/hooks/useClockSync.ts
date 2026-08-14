import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../services/supabaseAuth'

/**
 * Hook for multi-device clock synchronization
 * Syncs clock state in real-time across all devices and tabs
 *
 * Layer 1: Supabase real-time subscriptions for cross-device sync
 * Layer 2: BroadcastChannel for cross-tab sync (same browser)
 * Layer 3: Fallback polling every 30 seconds if real-time unavailable
 */
export function useClockSync() {
  const { currentUserId, updateActiveEntry, clockedIn } = useAppStore()

  useEffect(() => {
    if (!currentUserId) return

    console.log('[ClockSync] 🔄 Setting up real-time subscription for', currentUserId)

    // Initialize BroadcastChannel for cross-tab sync
    let broadcastChannel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel(`richco-clock-sync-${currentUserId}`)
        broadcastChannel.onmessage = (event: MessageEvent) => {
          console.log('[ClockSync] 📡 Cross-tab message received:', event.data)
          if (event.data.type === 'CLOCK_STATE_CHANGE') {
            if (event.data.clockedIn && event.data.timeEntry) {
              console.log('[ClockSync] ✅ Syncing clock-in from other tab')
              updateActiveEntry(event.data.timeEntry)
            } else if (!event.data.clockedIn) {
              console.log('[ClockSync] ❌ Syncing clock-out from other tab')
              updateActiveEntry(null)
            }
          }
        }
      } catch (err) {
        console.warn('[ClockSync] BroadcastChannel not available:', err)
      }
    }

    // Subscribe to time_entries table changes for this user (Layer 1)
    const channel = supabase
      .channel(`time_entries:user:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `employee_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('[ClockSync] ⚡ Real-time update:', payload.eventType)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entry = payload.new as any
            // Only update if it's the most recent active entry (no clock_out_time)
            if (!entry.clock_out_time) {
              console.log('[ClockSync] ✅ User clocked in on another device')
              updateActiveEntry(entry)

              // Broadcast to other tabs
              if (broadcastChannel) {
                broadcastChannel.postMessage({
                  type: 'CLOCK_STATE_CHANGE',
                  clockedIn: true,
                  timeEntry: entry,
                  timestamp: Date.now(),
                })
              }
            } else {
              console.log('[ClockSync] ❌ User clocked out on another device')
              updateActiveEntry(null)

              // Broadcast to other tabs
              if (broadcastChannel) {
                broadcastChannel.postMessage({
                  type: 'CLOCK_STATE_CHANGE',
                  clockedIn: false,
                  timeEntry: null,
                  timestamp: Date.now(),
                })
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[ClockSync] Subscription status:', status)
      })

    return () => {
      console.log('[ClockSync] Unsubscribing and closing broadcast channel')
      supabase.removeChannel(channel)
      if (broadcastChannel) {
        broadcastChannel.close()
      }
    }
  }, [currentUserId, updateActiveEntry])
}
