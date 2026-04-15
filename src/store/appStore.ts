import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimesheetEntry, Alert, ChatMessage } from '../types'
import { mockAlerts, currentUser } from '../data/mockData'
import { sendClockIn, sendClockOut, sendBreakEvent } from '../services/powerAutomate'
import { createTimeEntry, updateTimeEntry, getMandatoryBreakHours } from '../services/dataverse'

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

  // Navigation
  setActiveScreen: (screen: string) => void

  // Messages
  setUnreadMessageCount: (count: number) => void

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
      alerts: mockAlerts,
      unreadAlertCount: mockAlerts.filter(a => !a.read).length,
      unreadMessageCount: 4,
      activeScreen: 'home',
      chatMessages: [],

      clockIn: async (siteId, siteName, isOvernight, gps) => {
        const now = Date.now()
        const id = `ts-${now}`
        const { currentUserAadId, currentUserEmail, currentUserName } = get()

        // Create Dataverse entry
        const entryId = await createTimeEntry({
          craa5_employee: currentUserEmail,
          craa5_project: siteId,
          craa5_clockin: new Date(now).toISOString(),
          craa5_status: 'active',
        } as any)

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
        // Also send to Power Automate for compatibility
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

        // Update Dataverse entry with final data
        if (activeTimesheetId) {
          await updateTimeEntry(activeTimesheetId, {
            craa5_clockout: new Date(now).toISOString(),
            craa5_totalhours: parseFloat(rawHours.toFixed(4)),
            craa5_breakduration: Math.round(breakDurationMs / 60000), // Convert to minutes
            craa5_status: 'complete',
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

        // Update Dataverse entry
        if (activeTimesheetId) {
          await updateTimeEntry(activeTimesheetId, {
            craa5_breakstart: new Date(now).toISOString(),
          })
        }

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

        // Update Dataverse entry
        if (activeTimesheetId) {
          await updateTimeEntry(activeTimesheetId, {
            craa5_breakend: new Date().toISOString(),
            craa5_breakduration: breakDurationMinutes,
          })
        }

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

      setActiveScreen: (screen) => set({ activeScreen: screen }),

      setUnreadMessageCount: (count) => set({ unreadMessageCount: count }),

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
      }),
    }
  )
)
