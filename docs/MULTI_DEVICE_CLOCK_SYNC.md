# Multi-Device Clock-In/Out Synchronization Issue

## 🚨 Problem Confirmed

Clock-in/clock-out state is **NOT synchronized** across multiple devices.

### What User Reported
> "I tested it on computer and mobile when I clock in does it reflect that? It doesn't seem so"

### What's Happening

**Single Device (Works ✅)**
1. User clocks in on Device A
2. Updates Supabase (source of truth)
3. Updates Device A's local Zustand store
4. Device A shows "Clocked In" ✓

**Multiple Devices (Broken ❌)**
1. User clocks in on Device A (Computer)
2. Updates Supabase + Computer store
3. Device B (Mobile) has **NO notification**
4. Mobile still shows "Clock In" button (stale state)
5. ⚠️ **User could clock in TWICE** - once on each device!

---

## Root Causes

| Cause | Impact | Fix |
|-------|--------|-----|
| **No real-time subscription** | Other devices don't know about state changes | Add Supabase real-time listener |
| **No polling mechanism** | Changes aren't pulled periodically | Add background polling every 30s |
| **Store only syncs on app startup** | Only updates when App.tsx loads | Subscribe to changes on app startup |
| **No active time entry listener** | Don't know if current entry changed | Watch current employee's active time entry |

---

## Solution: Three Layers

### Layer 1: Real-Time Subscription (Primary)

**File:** `src/hooks/useClockSync.ts` (NEW)

```typescript
export function useClockSync() {
  const { currentUserId, appLocation } = useAppStore()
  const { updateClockState } = useAppStore()

  useEffect(() => {
    if (!currentUserId) return

    // Subscribe to current user's active time entry
    const subscription = supabase
      .from('time_entries')
      .on('*', // INSERT, UPDATE, DELETE
        payload => {
          if (payload.new?.employee_id === currentUserId) {
            console.log('[ClockSync] Real-time update:', payload)
            updateClockState(payload.new) // Update store
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }, [currentUserId, updateClockState])
}
```

### Layer 2: Polling Fallback (Every 30 seconds)

**File:** `src/services/supabase.ts`

```typescript
export async function getActiveTimeEntry(employeeId: string) {
  try {
    const response = await timeEntriesRequest(
      'GET',
      `/active?employee_id=${employeeId}`,
      null
    )
    return response?.[0] || null
  } catch (err) {
    console.error('[Supabase] Failed to get active time entry:', err)
    return null
  }
}
```

**File:** `src/App.tsx`

```typescript
// Poll for active time entry every 30 seconds
useEffect(() => {
  if (!authenticated || !currentUserId) return

  const pollInterval = setInterval(async () => {
    const activeEntry = await getActiveTimeEntry(currentUserId)
    if (activeEntry) {
      console.log('[App] Polling found active entry:', activeEntry)
      updateClockState(activeEntry)
    }
  }, 30000) // 30 seconds

  return () => clearInterval(pollInterval)
}, [authenticated, currentUserId, updateClockState])
```

### Layer 3: On-Focus Sync (Mobile)

**File:** `src/App.tsx`

```typescript
// When user returns to app window, sync immediately
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && currentUserId) {
      console.log('[App] App regained focus, syncing clock state...')
      syncClockState(currentUserId)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [currentUserId])
```

---

## Implementation Steps

### Step 1: Update Store with Clock State Methods ⏳

**File:** `src/store/appStore.ts`

Add to `AppState` interface:
```typescript
interface AppState {
  // ... existing ...
  
  // Clock sync
  syncClockState: (timeEntry: TimeEntry | null) => void
  updateActiveEntry: (entry: TimeEntry) => void
}
```

Add implementation:
```typescript
syncClockState: (timeEntry) => {
  if (!timeEntry) {
    set({
      clockedIn: false,
      clockInTime: null,
      activeTimesheetId: null,
      activeSheetEntry: null,
    })
    return
  }

  // Parse ISO time to milliseconds
  const clockInMs = new Date(timeEntry.clock_in_time).getTime()
  
  set({
    clockedIn: !timeEntry.clock_out_time,
    clockInTime: clockInMs,
    activeTimesheetId: timeEntry.id,
    activeSheetEntry: {
      id: timeEntry.id,
      date: timeEntry.clock_in_time.split('T')[0],
      siteId: timeEntry.site_id,
      siteName: timeEntry.site_name,
      clockInTime: clockInMs,
      status: timeEntry.clock_out_time ? 'complete' : 'active',
    },
  })
},

updateActiveEntry: (entry) => {
  console.log('[Store] Updating active entry from sync:', entry)
  get().syncClockState(entry)
}
```

### Step 2: Create useClockSync Hook ⏳

**File:** `src/hooks/useClockSync.ts` (NEW)

```typescript
import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { supabase } from '../services/supabaseAuth'

export function useClockSync() {
  const { currentUserId, updateActiveEntry } = useAppStore()

  useEffect(() => {
    if (!currentUserId) return

    console.log('[ClockSync] Setting up real-time subscription for', currentUserId)

    // Real-time subscription
    const subscription = supabase
      .from('time_entries')
      .on('*', payload => {
        if (payload.new?.employee_id === currentUserId && !payload.new.clock_out_time) {
          console.log('[ClockSync] ⚡ Real-time update: user is clocked in')
          updateActiveEntry(payload.new)
        } else if (payload.new?.employee_id === currentUserId && payload.new.clock_out_time) {
          console.log('[ClockSync] ⚡ Real-time update: user clocked out')
          updateActiveEntry(null)
        }
      })
      .subscribe()

    return () => {
      console.log('[ClockSync] Unsubscribing')
      subscription.unsubscribe()
    }
  }, [currentUserId, updateActiveEntry])
}
```

### Step 3: Add useClockSync to App.tsx ⏳

**File:** `src/App.tsx`

```typescript
import { useClockSync } from './hooks/useClockSync'

export default function App() {
  // ... existing code ...
  useClockSync() // Add this
  
  // ... rest of App.tsx ...
}
```

### Step 4: Add Polling Fallback ⏳

**File:** `src/App.tsx`

```typescript
useEffect(() => {
  if (!authenticated || !currentUserId) return

  // Poll every 30 seconds as fallback
  const pollInterval = setInterval(async () => {
    try {
      const activeEntry = await getActiveTimeEntry(currentUserId)
      if (activeEntry && !activeEntry.clock_out_time) {
        console.log('[App] Polling: found active entry')
        const { updateActiveEntry } = useAppStore.getState()
        updateActiveEntry(activeEntry)
      }
    } catch (err) {
      console.warn('[App] Polling failed:', err)
    }
  }, 30000)

  return () => clearInterval(pollInterval)
}, [authenticated, currentUserId])
```

### Step 5: Add On-Focus Sync ⏳

**File:** `src/App.tsx`

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && authenticated && currentUserId) {
      console.log('[App] App regained focus, syncing...')
      syncClockState(currentUserId)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [authenticated, currentUserId])
```

---

## Testing Plan

### Scenario 1: Computer → Mobile

1. ✓ Open app on Computer (desktop browser)
2. ✓ Open app on Mobile (same user account)
3. ✓ **Clock in on Computer**
4. ✓ Check Mobile **within 5 seconds** → Should show "Clocked In"
5. ✓ Refresh Mobile → Should still show "Clocked In"
6. ✓ Close Mobile app, reopen → Should remember "Clocked In"

### Scenario 2: Mobile → Computer

1. ✓ Open app on Mobile
2. ✓ Open app on Computer
3. ✓ **Clock in on Mobile**
4. ✓ Check Computer **within 5 seconds** → Should show "Clocked In"
5. ✓ Verify Computer clock timer is running
6. ✓ Navigate around app on Computer → Clock state should persist

### Scenario 3: Clock Out Sync

1. ✓ Clock in on Computer
2. ✓ Verify Mobile shows "Clocked In"
3. ✓ **Clock out on Mobile** with timesheet data
4. ✓ Check Computer **within 5 seconds** → Should show "Clock In" again
5. ✓ Verify timecard saved to localStorage on Computer

### Scenario 4: Offline Fallback

1. ✓ Clock in on Computer
2. ✓ Disconnect Mobile from internet
3. ✓ Reconnect Mobile
4. ✓ Clock state should sync within 30 seconds (polling)

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/store/appStore.ts` | Add syncClockState() + updateActiveEntry() | 🔴 HIGH |
| `src/hooks/useClockSync.ts` | NEW - Real-time subscription | 🔴 HIGH |
| `src/App.tsx` | Use useClockSync hook + polling + focus sync | 🔴 HIGH |
| `src/services/supabase.ts` | Add getActiveTimeEntry() | 🔴 HIGH |
| `src/types/index.ts` | Ensure TimeEntry type has all fields | 🟡 MEDIUM |

---

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐
│  Computer App   │         │   Mobile App    │
│  (Store)        │         │   (Store)       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  Real-time              │  Real-time
         │  Subscribe              │  Subscribe
         │                           │
         ├───────────────┬───────────┤
         │               │           │
         └───────────────┼───────────┘
                         │
                    ┌────▼────┐
                    │ Supabase│
                    │  time_  │
                    │ entries │
                    │(Source  │
                    │  of     │
                    │ Truth)  │
                    └─────────┘

Both apps subscribe to changes on time_entries table.
When one device updates, the other receives instant notification.
Polling (30s) catches any missed messages.
On-focus sync (immediate) catches updates while app was backgrounded.
```

---

## Success Criteria

✅ Clock in on Computer → Mobile shows update within 5 seconds
✅ Clock in on Mobile → Computer shows update within 5 seconds  
✅ Clock out syncs across devices instantly
✅ Works even if one device is offline (catches up when online)
✅ No duplicate clock-ins possible (Supabase validation)
✅ Timesheet data consistent everywhere

---

## Timeline

- **Phase 1 (Real-time):** ~40 minutes
- **Phase 2 (Polling):** ~15 minutes  
- **Phase 3 (On-focus):** ~10 minutes
- **Testing:** ~30 minutes
- **Total:** ~1.5 hours

---

## Notes

- Supabase real-time requires **authenticated user** (already have)
- Polling is fallback - won't hit rate limits at 30s interval
- On-focus sync immediate - catches backgrounded devices
- No polling on sleep/background saves battery (native apps would do this better)
- Consider adding visual indicator when syncing
