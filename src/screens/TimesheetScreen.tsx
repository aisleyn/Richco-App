import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, TrendingUp, Calendar, Plus, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ClockInCard } from '../components/home/ClockInCard'
import { ClockOutModal } from '../components/timesheet/ClockOutModal'
import { TimecardGrid } from '../components/timesheet/TimecardGrid'
import { TimeOffCard } from '../components/timesheet/TimeOffCard'
import { EditTimecardModal } from '../components/timesheet/EditTimecardModal'
import { ManualTimecardModal } from '../components/crew/ManualTimecardModal'
import { UpcomingShiftCard } from '../components/shifts/UpcomingShiftCard'
import { DailyChecklistCard } from '../components/shifts/DailyChecklistCard'
import { CreateShiftFormV2 } from '../components/admin/CreateShiftFormV2'
import { ShiftAssignmentManagerV2 } from '../components/admin/ShiftAssignmentManagerV2'
import { WeekNavigator } from '../components/timesheet/WeekNavigator'
import { EmployeeTimecardsGrid } from '../components/timesheet/EmployeeTimecardsGrid'
import { useAppStore } from '../store/appStore'
import { useElapsedTime } from '../hooks/useTimer'
import { useGeolocation } from '../hooks/useGeolocation'
import { isUserAdmin } from '../services/crew'
import { getCrewMemberByEmail, getAllCrewMembers } from '../services/supabase'
import { jobSites } from '../data/mockData'
import type { TimesheetEntry } from '../types'

interface Props {
  onNavigate: (s: string) => void
}

interface WeekStats {
  today: number
  week: number
  remaining: number
  overtimeWeek: number
  month: number
}

export function TimesheetScreen({ onNavigate }: Props) {
  const { clockedIn, clockIn, clockInTime, currentUserEmail, currentUserId } = useAppStore()
  const { requestLocation } = useGeolocation()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null)
  const [showClockOut, setShowClockOut] = useState(false)
  const [showManualTimecard, setShowManualTimecard] = useState(false)
  const [editingTimecard, setEditingTimecard] = useState<TimesheetEntry | null>(null)
  const [timecardRefresh, setTimecardRefresh] = useState(0)
  const [completedTodayHours, setCompletedTodayHours] = useState(0)
  const [weekStats, setWeekStats] = useState<WeekStats>({ today: 0, week: 0, remaining: 0, overtimeWeek: 0, month: 0 })
  const [isAdmin, setIsAdmin] = useState(false)
  const [crewMemberId, setCrewMemberId] = useState<number | null>(null)
  const [showCreateShift, setShowCreateShift] = useState(false)
  const [showSitePicker, setShowSitePicker] = useState(false)
  const [sites, setSites] = useState<typeof jobSites>([])
  const [selectedSite, setSelectedSite] = useState<typeof jobSites[0] | null>(null)
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const [isClockingIn, setIsClockingIn] = useState(false)
  const [pendingIsOvernight, setPendingIsOvernight] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [employees, setEmployees] = useState<any[]>([])
  const hours = elapsed / 3600000

  useEffect(() => {
    const loadUserData = async () => {
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)

      // Load crew member ID
      const crewMember = await getCrewMemberByEmail(currentUserEmail)
      if (crewMember) {
        setCrewMemberId(crewMember.id as number)
      }

      // Load all employees if admin
      if (admin) {
        const allEmployees = await getAllCrewMembers()
        setEmployees(allEmployees)
      }
    }
    loadUserData()
  }, [currentUserEmail])

  // Calculate stats from stored timecards
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()

    // Calculate week start: Saturday of the current/previous week
    // If today is Saturday (0), weekStart is today
    // Otherwise, go back to the last Saturday
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToSaturday = dayOfWeek === 6 ? 0 : (dayOfWeek === 0 ? -1 : (7 - dayOfWeek - 1))
    const weekStart = new Date(now.getTime() + daysToSaturday * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    try {
      const storageKey = `richco-completed-timecards-${currentUserId}`
      const stored = localStorage.getItem(storageKey)
      const timecards: TimesheetEntry[] = stored ? JSON.parse(stored) : []

      // Today's completed timecards
      const todayTimecards = timecards.filter(tc => tc.date === today)
      const completedToday = todayTimecards.reduce((sum, tc) => sum + (tc.totalHours || 0), 0)

      // This week (Saturday to Friday)
      const weekTimecards = timecards.filter(tc => tc.date >= weekStartStr && tc.date <= today)
      const weekHours = weekTimecards.reduce((sum, tc) => sum + (tc.totalHours || 0), 0)
      // Overtime is calculated as hours OVER 40 in the week
      const weekOvertime = Math.max(0, weekHours - 40)

      // This month
      const monthTimecards = timecards.filter(tc => tc.date >= monthStart && tc.date <= today)
      const monthHours = monthTimecards.reduce((sum, tc) => sum + (tc.totalHours || 0), 0)

      setCompletedTodayHours(completedToday)
      setWeekStats({
        today: completedToday,
        week: weekHours,
        remaining: Math.max(0, 40 - weekHours),
        overtimeWeek: weekOvertime,
        month: monthHours,
      })
    } catch (err) {
      console.error('[Timecard] Failed to read timecards:', err)
    }
  }, [timecardRefresh, currentUserId])

  function handleSaveEditedTimecard(timecard: TimesheetEntry) {
    try {
      const storageKey = `richco-completed-timecards-${currentUserId}`
      const stored = localStorage.getItem(storageKey)
      const timecards = stored ? JSON.parse(stored) : []
      const idx = timecards.findIndex((t: TimesheetEntry) => t.id === timecard.id)
      if (idx >= 0) {
        timecards[idx] = timecard
        localStorage.setItem(storageKey, JSON.stringify(timecards))
        setTimecardRefresh(prev => prev + 1)
      }
    } catch (err) {
      console.error('[Timecard] Failed to update timecard:', err)
    }
    setEditingTimecard(null)
  }

  function handleClockIn(isOvernight: boolean, overrideSiteId?: string, overrideSiteName?: string) {
    // If override provided, clock in immediately
    if (overrideSiteId && overrideSiteName) {
      confirmClockIn(overrideSiteId, overrideSiteName, isOvernight)
      return
    }

    // Otherwise show site picker
    setPendingIsOvernight(isOvernight)
    setShowSitePicker(true)
    setSites(jobSites)
    setSelectedSite(null)
  }

  async function confirmClockIn(siteId: string, siteName: string, isOvernight: boolean) {
    setIsClockingIn(true)

    // Request real GPS coordinates
    console.log('[TimesheetScreen] Requesting GPS for clock in...')
    const location = await requestLocation()
    console.log('[TimesheetScreen] GPS result:', location)

    if (!location) {
      console.warn('[TimesheetScreen] GPS failed, using site location only')
    }

    const site = jobSites.find(s => s.id === siteId)
    // Use real GPS if available, otherwise use site location
    const gps = location || (site ? { lat: site.lat, lng: site.lng, address: site.address } : { lat: 49.1234, lng: -122.7654, address: siteName })
    console.log('[TimesheetScreen] Clocking in with GPS data:', gps)
    clockIn(siteId, siteName, isOvernight, gps)
    setShowSitePicker(false)
    setSelectedSite(null)
    setIsClockingIn(false)
  }

  const todayHours = (clockedIn ? hours : 0) + completedTodayHours

  return (
    <AppLayout onNavigate={onNavigate}>
      <div className="pt-14">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-slate-800 text-2xl font-bold">Timesheet</h1>
          <p className="text-slate-500 text-sm mt-1">Track your hours and shifts</p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-green-600" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Today</span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">{todayHours.toFixed(2)}<span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-normal">h</span></p>
            {clockedIn && <p className="text-emerald-400 text-xs mt-1">Currently clocked in</p>}
          </div>

          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-green-400" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">This Week</span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">{(weekStats.week + hours).toFixed(2)}<span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-normal">h</span></p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{Math.max(0, 40 - (weekStats.week + hours)).toFixed(2)}h remaining</p>
          </div>

          <div className={`bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border shadow-md ${weekStats.overtimeWeek > 0 ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-amber-400" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Overtime</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold ${weekStats.overtimeWeek > 0 ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {weekStats.overtimeWeek.toFixed(2)}<span className="text-xs md:text-sm font-normal">h</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">This week</p>
          </div>

          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-purple-400" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">This Month</span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">{(weekStats.month + hours).toFixed(2)}<span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-normal">h</span></p>
          </div>
        </motion.div>

        {/* Week progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-md"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Weekly Progress</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs">{(weekStats.week + hours).toFixed(1)} / 40h</span>
          </div>
          <div className="h-2 bg-bg-elevated dark:bg-bg-elevated-dark rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((weekStats.week + hours) / 40) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-green-600 to-amber-400"
            />
          </div>
          {weekStats.overtimeWeek > 0 && (
            <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
              <TrendingUp size={10} /> {weekStats.overtimeWeek.toFixed(2)}h overtime this week
            </p>
          )}
        </motion.div>

        {/* Clock in card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5">
          <ClockInCard
            onClockIn={handleClockIn}
            onClockOut={() => setShowClockOut(true)}
            onNavigateTime={() => {}}
            isOvernightShift={false}
          />
        </motion.div>

        {/* Create Shift button - Admin only */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="mt-5"
          >
            <button
              onClick={() => setShowCreateShift(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <Calendar size={16} /> Create Shift
            </button>
          </motion.div>
        )}

        {/* Shift & Checklist Cards */}
        {crewMemberId && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6">
            <UpcomingShiftCard crewMemberId={crewMemberId} />
            <DailyChecklistCard crewMemberId={crewMemberId} />
          </motion.div>
        )}

        {/* Admin shift assignment management */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
            <ShiftAssignmentManagerV2 />
          </motion.div>
        )}

        {/* Personal Week History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Week History
            </h3>
            <WeekNavigator
              selectedDate={selectedWeek}
              onWeekChange={setSelectedWeek}
              showCurrentWeekButton={true}
            />
          </div>

          {/* Timecards */}
          <div className="flex items-center justify-between mb-3">
            {isAdmin && (
              <button
                onClick={() => setShowManualTimecard(true)}
                className="text-green-600 hover:text-green-700 flex items-center gap-1 text-xs font-semibold transition-colors"
              >
                <Plus size={12} /> Manual Entry
              </button>
            )}
          </div>
          <div className="mt-0">
            <TimecardGrid key={timecardRefresh} isAdmin={isAdmin} onEditTimecard={setEditingTimecard} selectedDate={selectedWeek} />
          </div>
        </motion.div>

        {/* All Employees' Timecards Grid (Admin only) - Below Week History */}
        {isAdmin && employees.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.40 }}
            className="mt-8"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Team Timecards
            </h3>
            <EmployeeTimecardsGrid
              employees={employees}
              selectedWeek={selectedWeek}
            />
          </motion.div>
        )}

        {/* Time Off Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6"
        >
          <TimeOffCard />
        </motion.div>
      </div>

      {showClockOut && (
        <ClockOutModal onClose={() => setShowClockOut(false)} onConfirm={() => { setShowClockOut(false); setTimecardRefresh(prev => prev + 1) }} />
      )}

      {/* Site picker modal */}
      {showSitePicker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSitePicker(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-2xl p-4 max-h-[90vh] overflow-y-auto shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 font-bold text-base">Select Job Site</h2>
              <button
                onClick={() => setShowSitePicker(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
              >
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            <div className="space-y-2">
              {sites.map((site) => (
                <motion.button
                  key={site.id}
                  onClick={() => setSelectedSite(site)}
                  className={`w-full p-3 rounded-lg text-left transition-colors text-sm ${
                    selectedSite?.id === site.id
                      ? 'bg-green-100 border border-green-600 text-slate-900'
                      : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-semibold">{site.name}</p>
                  {site.address && (
                    <p className="text-xs text-slate-500 mt-0.5">{site.address}</p>
                  )}
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => {
                if (selectedSite) {
                  confirmClockIn(selectedSite.id, selectedSite.name, pendingIsOvernight)
                }
              }}
              disabled={!selectedSite || isClockingIn}
              className="w-full mt-6 py-3 bg-green-600 hover:bg-amber-500 text-slate-900 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClockingIn ? 'Getting GPS...' : 'Clock In'}
            </button>
          </motion.div>
        </motion.div>
      )}

      <CreateShiftFormV2
        isOpen={showCreateShift}
        onClose={() => setShowCreateShift(false)}
        onSuccess={() => {}}
      />

      <AnimatePresence>
        {showManualTimecard && (
          <ManualTimecardModal
            onClose={() => setShowManualTimecard(false)}
            onTimecardCreated={() => setTimecardRefresh(prev => prev + 1)}
          />
        )}
        {editingTimecard && (
          <EditTimecardModal
            timecard={editingTimecard}
            onClose={() => setEditingTimecard(null)}
            onSave={handleSaveEditedTimecard}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
