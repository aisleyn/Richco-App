import { useState } from 'react'
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
import { isUserAdmin } from '../services/crew'
import { jobSites } from '../data/mockData'
import type { TimesheetEntry } from '../types'

const weekStats = { today: 0, week: 34.93, remaining: 5.07, overtimeWeek: 2.73, month: 134.18 }

interface Props {
  onNavigate: (s: string) => void
}

export function TimesheetScreen({ onNavigate: _onNavigate }: Props) {
  const { clockedIn, clockIn, clockInTime, currentUserEmail } = useAppStore()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null)
  const [showClockOut, setShowClockOut] = useState(false)
  const [showManualTimecard, setShowManualTimecard] = useState(false)
  const [editingTimecard, setEditingTimecard] = useState<TimesheetEntry | null>(null)
  const [timecardRefresh, setTimecardRefresh] = useState(0)
  const isAdmin = isUserAdmin(currentUserEmail)
  const hours = elapsed / 3600000

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

  function handleClockIn(isOvernight: boolean) {
    // Admins default to Office, others default to first active site
    const defaultSite = isAdmin ? jobSites.find(s => s.id === 'office') : jobSites.find(s => s.status === 'active' && s.id !== 'office')
    const siteId = defaultSite?.id ?? 'office'
    const siteName = defaultSite?.name ?? 'Office'
    const gps = defaultSite ? { lat: defaultSite.lat, lng: defaultSite.lng, address: defaultSite.address } : { lat: 49.1234, lng: -122.7654, address: 'Richco Office' }
    clockIn(siteId, siteName, isOvernight, gps)
  }

  const todayHours = clockedIn ? hours : 0

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
          className="mt-5 grid grid-cols-2 gap-3"
        >
          <div className="bg-bg-surface rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-brand-amber" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Today</span>
            </div>
            <p className="text-slate-800 text-2xl font-bold">{todayHours.toFixed(2)}<span className="text-slate-500 text-sm font-normal">h</span></p>
            {clockedIn && <p className="text-emerald-400 text-xs mt-1">Currently clocked in</p>}
          </div>

          <div className="bg-bg-surface rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-blue-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">This Week</span>
            </div>
            <p className="text-slate-800 text-2xl font-bold">{(weekStats.week + todayHours).toFixed(2)}<span className="text-slate-500 text-sm font-normal">h</span></p>
            <p className="text-slate-500 text-xs mt-1">{Math.max(0, weekStats.remaining - todayHours).toFixed(2)}h remaining</p>
          </div>

          <div className={`bg-bg-surface rounded-2xl p-4 border ${weekStats.overtimeWeek > 0 ? 'border-amber-500/20' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-amber-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Overtime</span>
            </div>
            <p className={`text-2xl font-bold ${weekStats.overtimeWeek > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              {weekStats.overtimeWeek.toFixed(2)}<span className="text-sm font-normal">h</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">This week</p>
          </div>

          <div className="bg-bg-surface rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-purple-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">This Month</span>
            </div>
            <p className="text-slate-800 text-2xl font-bold">{(weekStats.month + todayHours).toFixed(2)}<span className="text-slate-500 text-sm font-normal">h</span></p>
          </div>
        </motion.div>

        {/* Week progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 bg-bg-surface rounded-2xl p-4 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-slate-400 text-xs font-medium">Weekly Progress</span>
            <span className="text-slate-400 text-xs">{(weekStats.week + todayHours).toFixed(1)} / 40h</span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((weekStats.week + todayHours) / 40) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-amber to-amber-400"
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
              className="text-brand-amber hover:text-amber-500 flex items-center gap-1 text-xs font-semibold transition-colors"
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
        <ClockOutModal onClose={() => setShowClockOut(false)} onConfirm={() => setShowClockOut(false)} />
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
