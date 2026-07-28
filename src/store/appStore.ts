import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimesheetEntry, Alert, ChatMessage, Message } from '../types'
import { mockAlerts, mockMessages } from '../data/mockData'
import { sendClockIn, sendClockOut, sendBreakEvent } from '../services/powerAutomate'
import { createTimeEntry, updateTimeEntry, createBreakPeriod, endBreakPeriod } from '../services/supabase'
import { getMandatoryBreakHours } from '../services/dataverse'
import { generateLeaveRequestAlerts } from '../services/timeoff'
import { getProjectIdFromLocation } from '../services/projectLocationMap'

interface AppState {
  // Authentication
  currentUserName: string
  currentUserEmail: string
  currentUserId: string
  initializeUser: (name: string, email: string, userId: string) => void

  // Clock state
  clockedIn: boolean
  clockInTime: number | null
  breakActive: boolean
  breakStartTime: number | null
  totalBreakMs: number
  activeTimesheetId: string | null
  activeBreakPeriodId: string | null
  activeSheetEntry: Partial<TimesheetEntry> | null
  currentShiftIsOvernight: boolean // Track for break deduction
  currentProjectId?: string
  currentProjectName?: string

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
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeBreakPeriodId: null,
          activeSheetEntry: null,
        })
      },

      // Clock state (initialized per-user in initializeUser)
      clockedIn: false,
      clockInTime: null,
      breakActive: false,
      breakStartTime: null,
      totalBreakMs: 0,
      activeTimesheetId: null,
      activeBreakPeriodId: null,
      activeSheetEntry: null,
      currentShiftIsOvernight: false,
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
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: entryId || id,
          currentShiftIsOvernight: isOvernight,
          currentProjectId: projectId,
          currentProjectName: projectName,
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
      },

      clockOut: async (data) => {
        const { clockInTime, breakStartTime, totalBreakMs, activeTimesheetId, currentShiftIsOvernight, currentUserId, currentUserEmail, currentUserName, currentProjectId, currentProjectName } = get()
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
          projectId: currentProjectId,
          projectName: currentProjectName,
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
        // Only update if we have a real UUID (not a fallback local ID)
        if (activeTimesheetId && !activeTimesheetId.startsWith('ts-')) {
          const updated = await updateTimeEntry(activeTimesheetId, {
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
          if (!updated) {
            console.warn('[Store] Failed to update time entry in Supabase:', activeTimesheetId)
          }
        } else if (activeTimesheetId?.startsWith('ts-')) {
          console.warn('[Store] Fallback ID used, not updating Supabase:', activeTimesheetId)
        }

        set({
          clockedIn: false,
          clockInTime: null,
          breakActive: false,
          breakStartTime: null,
          totalBreakMs: 0,
          activeTimesheetId: null,
          activeBreakPeriodId: null,
          activeSheetEntry: null,
          currentShiftIsOvernight: false,
          currentProjectId: undefined,
          currentProjectName: undefined,
        })

        // Also send to Power Automate for compatibility
        sendClockOut({
          employeeId: currentUserId,
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
        const { breakStartTime, totalBreakMs, activeTimesheetId, activeBreakPeriodId, currentUserId } = get()
        const now = Date.now()
        const nowIso = new Date(now).toISOString()
        const additionalBreak = breakStartTime ? now - breakStartTime : 0
        const newTotal = totalBreakMs + additionalBreak
        const breakDurationMinutes = Math.round(additionalBreak / 60000)

        // Update break period in Supabase with end time
        if (activeBreakPeriodId) {
          await endBreakPeriod(activeBreakPeriodId, nowIso, breakDurationMinutes)
        }

        set({
          breakActive: false,
          breakStartTime: null,
          activeBreakPeriodId: null,
          totalBreakMs: newTotal,
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
