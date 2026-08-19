import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimesheetEntry, Alert, ChatMessage, Message } from '../types'
import { mockAlerts, mockMessages } from '../data/mockData'
import { sendClockIn, sendClockOut, sendBreakEvent } from '../services/powerAutomate'
import { createTimeEntry, updateTimeEntry, createBreakPeriod, endBreakPeriod, getCrewMemberByEmail, getActiveTimeEntry } from '../services/supabase'
import { getMandatoryBreakHours } from '../services/dataverse'
import { generateLeaveRequestAlerts } from '../services/timeoff'
import { getProjectIdFromLocation } from '../services/projectLocationMap'
import { sendClockInSMS, sendClockOutSMS } from '../services/twilioService'

interface AppState {
  // Authentication
  currentUserName: string
  currentUserEmail: string
  currentUserId: string
  initializeUser: (name: string, email: string, userId: string) => void
  clearUser: () => void

  // Clock state
  clockedIn: boolean
  clockInTime: number | null
  clockInLocation?: { lat: number; lng: number; address: string } | null
  breakActive: boolean
  breakStartTime: number | null
  totalBreakMs: number
  breaks: Array<{ startTime: number; endTime: number; duration: number }> // Track multiple breaks
  activeTimesheetId: string | null
  activeBreakPeriodId: string | null
  activeSheetEntry: Partial<TimesheetEntry> | null
  currentShiftIsOvernight: boolean // Track for break deduction
  currentProjectId?: string
  currentProjectName?: string
  isClockingOut: boolean // Flag to prevent sync race conditions

  // Alerts
  alerts: Alert[]
  unreadAlertCount: number

  // Messages
  unreadMessageCount: number
  crewMessages: Record<string, Message[]>
  crewActiveThread: string | null

  // Active screen
  activeScreen: string

  // AI chat
  chatMessages: ChatMessage[]

  // Clock in/out actions
  clockIn: (siteId: string, siteName: string, isOvernight: boolean, gps?: { lat: number; lng: number; address: string }) => void
  clockOut: (data: Partial<TimesheetEntry>) => void
  startBreak: () => void
  endBreak: () => void

  // Alerts
  markAlertRead: (id: string) => void
  markAllAlertsRead: () => void
  addAlert: (alert: Alert) => void
  refreshLeaveRequestAlerts: () => void

  // Navigation
  setActiveScreen: (screen: string) => void

  // Messages
  setUnreadMessageCount: (count: number) => void
  setCrewMessages: (msgs: Record<string, Message[]>) => void
  setCrewActiveThread: (id: string | null) => void
  addCrewMessage: (msg: Message) => void

  // AI
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Modal state
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void

  // Geolocation
  appLocation: { lat: number; lng: number; address: string } | null
  updateAppLocation: (location: { lat: number; lng: number; address: string }) => void

  // Multi-device clock sync
  syncClockState: (timeEntry: any | null) => void
  updateActiveEntry: (entry: any | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication
      currentUserName: '',
      currentUserEmail: '',
      currentUserId: '',
      initializeUser: (name: string, email: string, userId: string) => {
        console.log('[Store] Initializing user:', name, email)
        set({
          currentUserName: name,
          currentUserEmail: email,
          currentUserId: userId,
          // Reset per-user data when a new user logs in
          clockedIn: false,
          clockInTime: null,
          clockInLocation: null,
          breaks: [],
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeBreakPeriodId: null,
          activeSheetEntry: null,
          isClockingOut: false,
        })
      },

      clearUser: () => {
        console.log('[Store] Clearing user data')
        set({
          currentUserName: '',
          currentUserEmail: '',
          currentUserId: '',
          clockedIn: false,
          clockInTime: null,
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeBreakPeriodId: null,
          activeSheetEntry: null,
          crewMessages: {},
          crewActiveThread: null,
          chatMessages: [],
        })
      },

      // Clock state (initialized per-user in initializeUser)
      clockedIn: false,
      clockInTime: null,
      clockInLocation: null,
      breaks: [],
      breakActive: false,
      breakStartTime: null,
      totalBreakMs: 0,
      activeTimesheetId: null,
      activeBreakPeriodId: null,
      activeSheetEntry: null,
      currentShiftIsOvernight: false,
      isClockingOut: false,
      alerts: [...mockAlerts, ...generateLeaveRequestAlerts()] as Alert[],
      unreadAlertCount: [...mockAlerts, ...generateLeaveRequestAlerts()].filter(a => !a.read).length,
      unreadMessageCount: (() => {
        try {
          const stored = localStorage.getItem('richco-crew-messages')
          if (!stored) return 0
          const messages = JSON.parse(stored)
          let count = 0
          Object.values(messages).forEach((threadMessages: any) => {
            if (Array.isArray(threadMessages)) {
              count += threadMessages.filter((m: any) => !m.read).length
            }
          })
          return count
        } catch {
          return 0
        }
      })(),
      crewMessages: mockMessages,
      crewActiveThread: null,
      activeScreen: 'home',
      chatMessages: [],

      clockIn: async (siteId, siteName, isOvernight, gps) => {
        const now = Date.now()
        const id = `ts-${now}`
        const { currentUserId, currentUserEmail, currentUserName } = get()

        // Get projectId from location (location choice takes priority over shift roster)
        const { projectId, projectName } = await getProjectIdFromLocation(siteId)

        // Create Supabase entry (source of truth)
        const entryId = await createTimeEntry({
          employee_id: currentUserId,
          employee_name: currentUserName,
          site_id: siteId,
          site_name: siteName,
          clock_in_time: new Date(now).toISOString(),
          clock_in_latitude: gps?.lat,
          clock_in_longitude: gps?.lng,
          clock_in_address: gps?.address,
        })

        set({
          clockedIn: true,
          clockInTime: now,
          clockInLocation: gps || null,
          breaks: [],
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: entryId || id,
          currentShiftIsOvernight: isOvernight,
          currentProjectId: projectId,
          currentProjectName: projectName,
          isClockingOut: false,
          activeSheetEntry: {
            id: entryId || id,
            date: new Date().toISOString().split('T')[0],
            siteId,
            siteName,
            projectId,
            projectName,
            clockInTime: now,
            status: 'active',
            gpsIn: gps,
          },
        })

        // Also send to Power Automate for reporting/notifications
        sendClockIn({
          employeeId: currentUserId,
          employeeName: currentUserName,
          siteId,
          siteName,
          clockInTime: new Date(now).toISOString(),
          gpsLat: gps?.lat,
          gpsLng: gps?.lng,
          gpsAddress: gps?.address,
          geofenceFlag: false,
          scheduledStartTime: '07:00',
        })

        // Send SMS notification (non-blocking)
        try {
          const crewMember = await getCrewMemberByEmail(currentUserEmail)
          if (crewMember?.phone) {
            sendClockInSMS(crewMember.phone, currentUserName, siteName, new Date(now).toISOString()).catch(err => {
              console.warn('[SMS] Failed to send clock-in SMS:', err)
            })
          }
        } catch (err) {
          console.warn('[SMS] Error getting crew member for SMS:', err)
        }
      },

      clockOut: async (data) => {
        // Set flag to prevent sync from overwriting state during clock-out
        set({ isClockingOut: true })

        const { clockInTime, breakStartTime, totalBreakMs, activeTimesheetId, currentShiftIsOvernight, currentUserId, currentUserEmail, currentUserName, currentProjectId, currentProjectName, breaks } = get()
        const now = Date.now()

        // Calculate total elapsed time and break duration
        const totalElapsedMs = now - (clockInTime ?? now)
        const breakDurationMs = totalBreakMs + (breakStartTime ? now - breakStartTime : 0)

        // Track final break if one is active
        let finalBreaks = [...breaks]
        if (breakStartTime) {
          finalBreaks.push({
            startTime: breakStartTime,
            endTime: now,
            duration: now - breakStartTime
          })
        }

        // Work time = total elapsed - breaks
        const workMs = Math.max(0, totalElapsedMs - breakDurationMs)

        // Hours
        const rawHours = workMs / 3600000 // Work time without mandatory break
        const breakHours = breakDurationMs / 3600000 // Actual breaks taken
        const mandatoryBreak = getMandatoryBreakHours(currentShiftIsOvernight)
        const paidHours = Math.max(0, rawHours - mandatoryBreak) // Hours after mandatory breaks

        // Save completed timecard to localStorage
        // NOTE: Overtime is calculated WEEKLY (not daily) - see TimesheetScreen for weekly calculation
        const completedTimecard: TimesheetEntry = {
          id: activeTimesheetId ?? `ts-${now}`,
          date: new Date(clockInTime ?? now).toISOString().split('T')[0],
          siteName: data.siteName ?? '',
          siteId: data.siteId ?? '',
          projectId: currentProjectId,
          projectName: currentProjectName,
          clockInTime: clockInTime ?? now,
          clockOutTime: now,
          breakMinutes: Math.round(breakDurationMs / 60000),
          totalHours: parseFloat(paidHours.toFixed(2)), // Use paid hours (after mandatory breaks)
          overtimeHours: 0, // Overtime calculated weekly, not daily
          status: 'complete',
          breakTaken: (data.breakTaken ?? false) || breakDurationMs > 0,
          shiftSummary: data.shiftSummary,
          concerns: data.concerns,
          vehicleUsed: data.vehicleUsed,
          photos: data.photos,
          gpsIn: data.gpsIn,
        }

        try {
          const storageKey = `richco-completed-timecards-${currentUserId}`
          const existing = localStorage.getItem(storageKey)
          const timecards: TimesheetEntry[] = existing ? JSON.parse(existing) : []
          timecards.unshift(completedTimecard) // Add to front (most recent first)
          localStorage.setItem(storageKey, JSON.stringify(timecards.slice(0, 30))) // Keep last 30
          console.log('[Store] Saved timecard to localStorage for user:', currentUserId)
        } catch (err) {
          console.error('[Store] Failed to save timecard to localStorage:', err)
        }

        // Update Supabase entry with final data (source of truth)
        // Only update if we have a real UUID (not a fallback local ID)
        if (activeTimesheetId && !activeTimesheetId.startsWith('ts-')) {
          console.log('[Store] Clocking out entry:', activeTimesheetId)

          const clockOutTime = new Date(now).toISOString()
          const updated = await updateTimeEntry(activeTimesheetId, {
            clock_out_time: clockOutTime,
            clock_out_latitude: data.gpsOut?.lat,
            clock_out_longitude: data.gpsOut?.lng,
            clock_out_address: data.gpsOut?.address,
            total_hours: parseFloat(paidHours.toFixed(4)), // Use paid hours (after mandatory breaks)
            break_hours: parseFloat((breakDurationMs / 3600000).toFixed(4)),
            regular_hours: parseFloat(paidHours.toFixed(4)), // All hours are regular at entry level; overtime calculated weekly
            overtime_hours: 0, // Overtime calculated weekly, not daily
            shift_notes: data.shiftSummary,
            concerns: data.concerns,
            vehicle_used: data.vehicleUsed,
            break_taken: data.breakTaken ?? false,
            photos_count: data.photos?.length ?? 0,
          })

          if (!updated) {
            console.error('[Store] ❌ FAILED to update time entry in Supabase:', activeTimesheetId)
          } else {
            console.log('[Store] ✅ Successfully clocked out:', activeTimesheetId, 'at', clockOutTime)

            // CLEANUP: Check for and close any other active entries for this user (stale entries)
            if (currentUserId) {
              try {
                const otherActive = await getActiveTimeEntry(currentUserId)
                if (otherActive && otherActive.id && otherActive.id !== activeTimesheetId) {
                  console.warn('[Store] ⚠️ Found stale active entry:', otherActive.id, '- closing it')
                  // Close the stale entry with the same time (to prevent further issues)
                  await updateTimeEntry(otherActive.id, {
                    clock_out_time: clockOutTime,
                    total_hours: (otherActive.total_hours ?? 0) as number,
                  } as any)
                  console.log('[Store] ✅ Closed stale entry:', otherActive.id)
                }
              } catch (err) {
                console.warn('[Store] Could not check for stale entries:', err)
              }
            }
          }
        } else if (activeTimesheetId?.startsWith('ts-')) {
          console.warn('[Store] Fallback ID used, not updating Supabase:', activeTimesheetId)
        } else {
          console.warn('[Store] ⚠️ No activeTimesheetId set - clock-out might not be recorded')
        }

        set({
          clockedIn: false,
          clockInTime: null,
          clockInLocation: null,
          breaks: [],
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeBreakPeriodId: null,
          activeSheetEntry: null,
          currentShiftIsOvernight: false,
          currentProjectId: undefined,
          currentProjectName: undefined,
          isClockingOut: false, // Clear flag after state update
        })

        // Prevent sync from overwriting the clocked-out state for 3 seconds
        setTimeout(() => {
          set({ isClockingOut: false })
        }, 3000)

        // Also send to Power Automate for compatibility
        // NOTE: Overtime is calculated WEEKLY; here we pass paid hours as regular
        sendClockOut({
          employeeId: currentUserId,
          employeeName: currentUserName,
          timesheetId: activeTimesheetId ?? `ts-${now}`,
          siteId: data.siteId ?? '',
          siteName: data.siteName ?? '',
          clockInTime: new Date(clockInTime ?? now).toISOString(),
          clockOutTime: new Date(now).toISOString(),
          totalHoursDecimal: parseFloat(paidHours.toFixed(4)), // Paid hours (after mandatory breaks)
          breakHoursDecimal: parseFloat(breakHours.toFixed(4)),
          regularHours: parseFloat(paidHours.toFixed(4)), // All paid hours count as regular at entry level
          overtimeHours: 0, // Overtime calculated weekly, not daily
          vehicleId: data.vehicleUsed,
          breakTaken: data.breakTaken ?? false,
          shiftSummary: data.shiftSummary ?? '',
          concerns: data.concerns,
          photoCount: data.photos?.length ?? 0,
        })

        // Send SMS notification (non-blocking)
        try {
          const crewMember = await getCrewMemberByEmail(currentUserEmail)
          if (crewMember?.phone) {
            sendClockOutSMS(crewMember.phone, currentUserName, data.siteName ?? '', parseFloat(rawHours.toFixed(2)), new Date(now).toISOString()).catch(err => {
              console.warn('[SMS] Failed to send clock-out SMS:', err)
            })
          }
        } catch (err) {
          console.warn('[SMS] Error getting crew member for SMS:', err)
        }
      },

      startBreak: async () => {
        const { activeTimesheetId, currentUserId } = get()
        const now = Date.now()
        const nowIso = new Date(now).toISOString()

        // Create break period in Supabase
        const breakPeriodId = await createBreakPeriod({
          time_entry_id: activeTimesheetId ?? '',
          break_start: nowIso,
        })

        set({ breakActive: true, breakStartTime: now, activeBreakPeriodId: breakPeriodId })

        // Also notify Power Automate
        sendBreakEvent({
          employeeId: currentUserId,
          timesheetId: activeTimesheetId ?? '',
          event: 'start',
          timestamp: nowIso,
        })
      },

      endBreak: async () => {
        const { breakStartTime, totalBreakMs, activeTimesheetId, activeBreakPeriodId, currentUserId, breaks } = get()
        const now = Date.now()
        const nowIso = new Date(now).toISOString()
        const additionalBreak = breakStartTime ? now - breakStartTime : 0
        const newTotal = totalBreakMs + additionalBreak
        const breakDurationMinutes = Math.round(additionalBreak / 60000)

        // Update break period in Supabase with end time
        if (activeBreakPeriodId) {
          await endBreakPeriod(activeBreakPeriodId, nowIso, breakDurationMinutes)
        }

        // Track this break in the breaks array
        const newBreaks = [...breaks]
        if (breakStartTime) {
          newBreaks.push({
            startTime: breakStartTime,
            endTime: now,
            duration: additionalBreak
          })
        }

        set({
          breakActive: false,
          breakStartTime: null,
          activeBreakPeriodId: null,
          totalBreakMs: newTotal,
          breaks: newBreaks,
        })

        // Also notify Power Automate
        sendBreakEvent({
          employeeId: currentUserId,
          timesheetId: activeTimesheetId ?? '',
          event: 'end',
          timestamp: nowIso,
          breakDurationMinutes,
        })
      },

      markAlertRead: (id) => {
        set(state => {
          const alerts = state.alerts.map(a => a.id === id ? { ...a, read: true } : a)
          return { alerts, unreadAlertCount: alerts.filter(a => !a.read).length }
        })
      },

      markAllAlertsRead: () => {
        set(state => ({
          alerts: state.alerts.map(a => ({ ...a, read: true })),
          unreadAlertCount: 0,
        }))
      },

      addAlert: (alert) => {
        set(state => ({
          alerts: [alert, ...state.alerts],
          unreadAlertCount: state.unreadAlertCount + 1,
        }))
      },

      refreshLeaveRequestAlerts: () => {
        set(state => {
          const leaveAlerts = generateLeaveRequestAlerts()
          // Remove old leave request alerts and add new ones
          const nonLeaveAlerts = state.alerts.filter(a => a.type !== 'leave_request')
          const updatedAlerts = [...leaveAlerts, ...nonLeaveAlerts]
          return {
            alerts: updatedAlerts,
            unreadAlertCount: updatedAlerts.filter(a => !a.read).length,
          }
        })
      },

      setActiveScreen: (screen) => set({ activeScreen: screen }),

      setUnreadMessageCount: (count) => set({ unreadMessageCount: count }),

      setCrewMessages: (msgs) => set({ crewMessages: msgs }),

      setCrewActiveThread: (id) => set({ crewActiveThread: id }),

      addCrewMessage: (msg) => set(state => ({
        crewMessages: {
          ...state.crewMessages,
          [msg.threadId]: [...(state.crewMessages[msg.threadId] ?? []), msg]
        }
      })),

      addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, msg] })),

      clearChat: () => set({ chatMessages: [] }),

      isModalOpen: false,
      setIsModalOpen: (open) => set({ isModalOpen: open }),

      // Geolocation
      appLocation: null,
      updateAppLocation: (location) => {
        console.log('[Store] Updating app location:', location)
        set({ appLocation: location })
      },

      // Multi-device clock sync
      syncClockState: (timeEntry) => {
        const { isClockingOut } = get()

        // Don't sync if we're currently clocking out (prevent race condition)
        if (isClockingOut) {
          console.log('[Store] Skipping sync during clock-out to prevent race condition')
          return
        }

        if (!timeEntry) {
          console.log('[Store] Syncing clock state: user clocked out')
          set({
            clockedIn: false,
            clockInTime: null,
            clockInLocation: null,
            breaks: [],
            activeTimesheetId: null,
            activeSheetEntry: null,
          })
          return
        }

        console.log('[Store] Syncing clock state: user clocked in')
        const clockInMs = new Date(timeEntry.clock_in_time).getTime()

        set({
          clockedIn: !timeEntry.clock_out_time,
          clockInTime: timeEntry.clock_out_time ? null : clockInMs,
          clockInLocation: timeEntry.clock_out_time ? null : {
            lat: timeEntry.clock_in_latitude || 0,
            lng: timeEntry.clock_in_longitude || 0,
            address: timeEntry.clock_in_address || 'Unknown'
          },
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
        console.log('[Store] Updating active entry from sync:', entry?.id)
        get().syncClockState(entry)
      },
    }),
    {
      name: 'richco-app-state',
      partialize: (state) => ({
        clockedIn: state.clockedIn,
        clockInTime: state.clockInTime,
        clockInLocation: state.clockInLocation,
        breakActive: state.breakActive,
        breakStartTime: state.breakStartTime,
        totalBreakMs: state.totalBreakMs,
        breaks: state.breaks,
        activeTimesheetId: state.activeTimesheetId,
        activeBreakPeriodId: state.activeBreakPeriodId,
        activeSheetEntry: state.activeSheetEntry,
        currentShiftIsOvernight: state.currentShiftIsOvernight,
        currentUserId: state.currentUserId,
        currentUserName: state.currentUserName,
        currentUserEmail: state.currentUserEmail,
        crewMessages: state.crewMessages,
        crewActiveThread: state.crewActiveThread,
      }),
    }
  )
)
