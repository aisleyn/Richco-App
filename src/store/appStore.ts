import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimesheetEntry, Alert, ChatMessage, Message } from '../types'
import { mockAlerts, mockMessages, currentUser } from '../data/mockData'
import { sendClockIn, sendClockOut, sendBreakEvent } from '../services/powerAutomate'
import { createTimeEntry, updateTimeEntry } from '../services/supabase'
import { getMandatoryBreakHours } from '../services/dataverse'
import { generateLeaveRequestAlerts } from '../services/timeoff'

interface AppState {
  // Authentication
  currentUserName: string
  currentUserEmail: string
  currentUserAadId: string
  initializeUser: (name: string, email: string, aadId: string) => void

  // Clock state
  clockedIn: boolean
  clockInTime: number | null
  breakActive: boolean
  breakStartTime: number | null
  totalBreakMs: number
  activeTimesheetId: string | null
  activeSheetEntry: Partial<TimesheetEntry> | null
  currentShiftIsOvernight: boolean // Track for break deduction

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication
      currentUserName: currentUser.firstName + ' ' + currentUser.lastName,
      currentUserEmail: currentUser.email,
      currentUserAadId: currentUser.id,
      initializeUser: (name: string, email: string, aadId: string) => {
        set({ currentUserName: name, currentUserEmail: email, currentUserAadId: aadId })
      },

      // Clock state
      clockedIn: false,
      clockInTime: null,
      breakActive: false,
      breakStartTime: null,
      totalBreakMs: 0,
      activeTimesheetId: null,
      activeSheetEntry: null,
      currentShiftIsOvernight: false,
      alerts: [...mockAlerts, ...generateLeaveRequestAlerts()] as Alert[],
      unreadAlertCount: [...mockAlerts, ...generateLeaveRequestAlerts()].filter(a => !a.read).length,
      unreadMessageCount: 4,
      crewMessages: mockMessages,
      crewActiveThread: null,
      activeScreen: 'home',
      chatMessages: [],

      clockIn: async (siteId, siteName, isOvernight, gps) => {
        const now = Date.now()
        const id = `ts-${now}`
        const { currentUserAadId, currentUserEmail, currentUserName } = get()

        // Create Supabase entry (source of truth)
        const entryId = await createTimeEntry({
          employee_id: currentUserAadId,
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
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: entryId || id,
          currentShiftIsOvernight: isOvernight,
          activeSheetEntry: {
            id: entryId || id,
            date: new Date().toISOString().split('T')[0],
            siteId,
            siteName,
            clockInTime: now,
            status: 'active',
            gpsIn: gps,
          },
        })

        // Also send to Power Automate for reporting/notifications
        sendClockIn({
          employeeId: currentUserAadId,
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
      },

      clockOut: async (data) => {
        const { clockInTime, breakStartTime, totalBreakMs, activeTimesheetId, currentShiftIsOvernight, currentUserAadId, currentUserEmail, currentUserName } = get()
        const now = Date.now()

        // Calculate total elapsed time and break duration
        const totalElapsedMs = now - (clockInTime ?? now)
        const breakDurationMs = totalBreakMs + (breakStartTime ? now - breakStartTime : 0)

        // Work time = total elapsed - breaks
        const workMs = Math.max(0, totalElapsedMs - breakDurationMs)

        // Hours
        const rawHours = workMs / 3600000 // Work time without mandatory break
        const breakHours = breakDurationMs / 3600000 // Actual breaks taken
        const mandatoryBreak = getMandatoryBreakHours(currentShiftIsOvernight)
        const paidHours = Math.max(0, rawHours - mandatoryBreak)
        const regularHours = Math.min(paidHours, 8)
        const overtimeHours = Math.max(0, paidHours - 8)

        // Save completed timecard to localStorage
        const completedTimecard: TimesheetEntry = {
          id: activeTimesheetId ?? `ts-${now}`,
          date: new Date(clockInTime ?? now).toISOString().split('T')[0],
          siteName: data.siteName ?? '',
          siteId: data.siteId ?? '',
          clockInTime: clockInTime ?? now,
          clockOutTime: now,
          breakMinutes: Math.round(breakDurationMs / 60000),
          totalHours: parseFloat(rawHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          status: 'complete',
          breakTaken: (data.breakTaken ?? false) || breakDurationMs > 0,
          shiftSummary: data.shiftSummary,
          concerns: data.concerns,
          vehicleUsed: data.vehicleUsed,
          photos: data.photos,
          gpsIn: data.gpsIn,
        }

        try {
          const existing = localStorage.getItem('richco-completed-timecards')
          const timecards: TimesheetEntry[] = existing ? JSON.parse(existing) : []
          timecards.unshift(completedTimecard) // Add to front (most recent first)
          localStorage.setItem('richco-completed-timecards', JSON.stringify(timecards.slice(0, 30))) // Keep last 30
          console.log('[Store] Saved timecard to localStorage:', completedTimecard)
        } catch (err) {
          console.error('[Store] Failed to save timecard to localStorage:', err)
        }

        // Update Supabase entry with final data (source of truth)
        if (activeTimesheetId) {
          await updateTimeEntry(activeTimesheetId, {
            clock_out_time: new Date(now).toISOString(),
            clock_out_latitude: data.gpsOut?.lat,
            clock_out_longitude: data.gpsOut?.lng,
            clock_out_address: data.gpsOut?.address,
            total_hours: parseFloat(rawHours.toFixed(4)),
            break_hours: parseFloat((breakDurationMs / 3600000).toFixed(4)),
            regular_hours: parseFloat(regularHours.toFixed(4)),
            overtime_hours: parseFloat(overtimeHours.toFixed(4)),
            shift_notes: data.shiftSummary,
            concerns: data.concerns,
            vehicle_used: data.vehicleUsed,
            break_taken: data.breakTaken ?? false,
            photos_count: data.photos?.length ?? 0,
          })
        }

        set({
          clockedIn: false,
          clockInTime: null,
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeSheetEntry: null,
          currentShiftIsOvernight: false,
        })

        // Also send to Power Automate for compatibility
        sendClockOut({
          employeeId: currentUserAadId,
          employeeName: currentUserName,
          timesheetId: activeTimesheetId ?? `ts-${now}`,
          siteId: data.siteId ?? '',
          siteName: data.siteName ?? '',
          clockInTime: new Date(clockInTime ?? now).toISOString(),
          clockOutTime: new Date(now).toISOString(),
          totalHoursDecimal: parseFloat(rawHours.toFixed(4)),
          breakHoursDecimal: parseFloat(breakHours.toFixed(4)),
          regularHours: parseFloat(regularHours.toFixed(4)),
          overtimeHours: parseFloat(overtimeHours.toFixed(4)),
          vehicleId: data.vehicleUsed,
          breakTaken: data.breakTaken ?? false,
          shiftSummary: data.shiftSummary ?? '',
          concerns: data.concerns,
          photoCount: data.photos?.length ?? 0,
        })
      },

      startBreak: async () => {
        const { activeTimesheetId, currentUserAadId } = get()
        const now = Date.now()
        set({ breakActive: true, breakStartTime: now })

        // Break data is tracked and saved at clock-out time
        sendBreakEvent({
          employeeId: currentUserAadId,
          timesheetId: activeTimesheetId ?? '',
          event: 'start',
          timestamp: new Date(now).toISOString(),
        })
      },

      endBreak: async () => {
        const { breakStartTime, totalBreakMs, activeTimesheetId, currentUserAadId } = get()
        const additionalBreak = breakStartTime ? Date.now() - breakStartTime : 0
        const newTotal = totalBreakMs + additionalBreak
        const breakDurationMinutes = Math.round(additionalBreak / 60000)

        set({
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: newTotal,
        })

        // Break duration is tracked and saved to Dataverse at clock-out time
        sendBreakEvent({
          employeeId: currentUserAadId,
          timesheetId: activeTimesheetId ?? '',
          event: 'end',
          timestamp: new Date().toISOString(),
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
    }),
    {
      name: 'richco-app-state',
      partialize: (state) => ({
        clockedIn: state.clockedIn,
        clockInTime: state.clockInTime,
        breakActive: state.breakActive,
        breakStartTime: state.breakStartTime,
        totalBreakMs: state.totalBreakMs,
        activeTimesheetId: state.activeTimesheetId,
        activeSheetEntry: state.activeSheetEntry,
        currentShiftIsOvernight: state.currentShiftIsOvernight,
        currentUserAadId: state.currentUserAadId,
        crewMessages: state.crewMessages,
        crewActiveThread: state.crewActiveThread,
      }),
    }
  )
)
