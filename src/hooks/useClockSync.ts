import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../services/supabaseAuth'

export function useClockSync() {
  const { currentUserId, updateActiveEntry } = useAppStore()

  useEffect(() => {
    if (!currentUserId) return

    console.log('[ClockSync] Setting up real-time subscription for', currentUserId)

    // Subscribe to time_entries table changes for this user
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
          console.log('[ClockSync] ⚡ Real-time update:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entry = payload.new as any
            // Only update if it's the most recent active entry (no clock_out_time)
            if (!entry.clock_out_time) {
              console.log('[ClockSync] User is clocked in')
              updateActiveEntry(entry)
            } else {
              console.log('[ClockSync] User clocked out')
              updateActiveEntry(null)
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[ClockSync] Unsubscribing')
      supabase.removeChannel(channel)
    }
  }, [currentUserId, updateActiveEntry])
}
