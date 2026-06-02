import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, TrendingUp, Calendar, Plus } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ClockInCard } from '../components/home/ClockInCard'
import { ClockOutModal } from '../components/timesheet/ClockOutModal'
import { TimecardList } from '../components/timesheet/Timecard'
import { TimeOffCard } from '../components/timesheet/TimeOffCard'
import { EditTimecardModal } from '../components/timesheet/EditTimecardModal'
import { ManualTimecardModal } from '../components/crew/ManualTimecardModal'
import { useAppStore } from '../store/appStore'
import { useElapsedTime } from '../hooks/useTimer'
import { useGeolocation } from '../hooks/useGeolocation'
import { isUserAdmin } from '../services/crew'
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

export function TimesheetScreen({ onNavigate: _onNavigate }: Props) {
  const { clockedIn, clockIn, clockInTime, currentUserEmail } = useAppStore()
  const { requestLocation } = useGeolocation()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null)
  const [showClockOut, setShowClockOut] = useState(false)
  const [showManualTimecard, setShowManualTimecard] = useState(false)
  const [editingTimecard, setEditingTimecard] = useState<TimesheetEntry | null>(null)
  const [timecardRefresh, setTimecardRefresh] = useState(0)
  const [completedTodayHours, setCompletedTodayHours] = useState(0)
  const [weekStats, setWeekStats] = useState<WeekStats>({ today: 0, week: 0, remaining: 0, overtimeWeek: 0, month: 0 })
  const isAdmin = isUserAdmin(currentUserEmail)
  const hours = elapsed / 3600000

  // Calculate stats from stored timecards
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    try {
      const stored = localStorage.getItem('richco-completed-timecards')
      const timecards: TimesheetEntry[] = stored ? JSON.parse(stored) : []

      // Today's completed timecards
      const todayTimecards = timecards.filter(tc => tc.date === today)
      const completedToday = todayTimecards.reduce((sum, tc) => sum + (tc.totalHours || 0), 0)

      // This week (past 7 days)
      const weekTimecards = timecards.filter(tc => tc.date >= weekStart && tc.date <= today)
      const weekHours = weekTimecards.reduce((sum, tc) => sum + (tc.totalHours || 0), 0)
      const weekOvertime = weekTimecards.reduce((sum, tc) => sum + (tc.overtimeHours || 0), 0)

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
  }, [timecardRefresh])

  function handleSaveEditedTimecard(timecard: TimesheetEntry) {
    try {
      const stored = localStorage.getItem('richco-completed-timecards')
      const timecards = stored ? JSON.parse(stored) : []
      const idx = timecards.findIndex((t: TimesheetEntry) => t.id === timecard.id)
      if (idx >= 0) {
        timecards[idx] = timecard
        localStorage.setItem('richco-completed-timecards', JSON.stringify(timecards))
        setTimecardRefresh(prev => prev + 1)
      }
    } catch (err) {
      console.error('[Timecard] Failed to update timecard:', err)
    }
    setEditingTimecard(null)
  }

  async function handleClockIn(isOvernight: boolean) {
    // Admins default to Office, others default to first active site
    const defaultSite = isAdmin ? jobSites.find(s => s.id === 'office') : jobSites.find(s => s.status === 'active' && s.id !== 'office')
    const siteId = defaultSite?.id ?? 'office'
    const siteName = defaultSite?.name ?? 'Office'

    // Request real GPS coordinates
    console.log('[TimesheetScreen] Requesting GPS for quick clock in...')
    const location = await requestLocation()
    console.log('[TimesheetScreen] GPS result:', location)

    if (!location) {
      console.warn('[TimesheetScreen] GPS failed, using site location only')
    }

    // Use real GPS if available, otherwise use site location
    const gps = location || (defaultSite ? { lat: defaultSite.lat, lng: defaultSite.lng, address: defaultSite.address } : { lat: 49.1234, lng: -122.7654, address: 'Richco Office' })
    console.log('[TimesheetScreen] Clocking in with GPS data:', gps)
    clockIn(siteId, siteName, isOvernight, gps)
  }

  const todayHours = (clockedIn ? hours : 0) + completedTodayHours

  return (
    <AppLayout>
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
          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-blue-600" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Today</span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">{todayHours.toFixed(2)}<span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-normal">h</span></p>
            {clockedIn && <p className="text-emerald-400 text-xs mt-1">Currently clocked in</p>}
          </div>

          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-blue-400" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">This Week</span>
            </div>
            <p className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">{(weekStats.week + hours).toFixed(2)}<span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-normal">h</span></p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{Math.max(0, 40 - (weekStats.week + hours)).toFixed(2)}h remaining</p>
          </div>

          <div className={`bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border ${weekStats.overtimeWeek > 0 ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-amber-400" />
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider">Overtime</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold ${weekStats.overtimeWeek > 0 ? 'text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {weekStats.overtimeWeek.toFixed(2)}<span className="text-xs md:text-sm font-normal">h</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">This week</p>
          </div>

          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
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
          className="mt-3 bg-bg-surface dark:bg-bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700"
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
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-400"
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

        {/* Timecards */}
        <div className="mt-6 flex items-center justify-between mb-3">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recent Timecards</h3>
          {isAdmin && (
            <button
              onClick={() => setShowManualTimecard(true)}
              className="text-blue-600 hover:text-amber-500 flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              <Plus size={12} /> Manual
            </button>
          )}
        </div>
        <div className="mt-0">
          <TimecardList key={timecardRefresh} isAdmin={isAdmin} onEditTimecard={setEditingTimecard} />
        </div>

        {/* Time Off Card */}
        <TimeOffCard />
      </div>

      {showClockOut && (
        <ClockOutModal onClose={() => setShowClockOut(false)} onConfirm={() => { setShowClockOut(false); setTimecardRefresh(prev => prev + 1) }} />
      )}

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
