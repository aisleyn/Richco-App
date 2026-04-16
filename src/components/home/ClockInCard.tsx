import { motion } from 'framer-motion'
import { MapPin, Clock, Play, Pause, Square } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useElapsedTime, formatElapsed } from '../../hooks/useTimer'
import { todayShifts } from '../../data/mockData'

interface Props {
  onClockIn: (isOvernight: boolean) => void
  onClockOut: () => void
  onNavigateTime: () => void
  isOvernightShift?: boolean
}

export function ClockInCard({ onClockIn, onClockOut, onNavigateTime, isOvernightShift = false }: Props) {
  const { clockedIn, clockInTime, breakActive, breakStartTime, totalBreakMs, startBreak, endBreak } = useAppStore()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null, breakActive, breakStartTime, totalBreakMs)
  const shift = todayShifts[0]

  if (clockedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-900/60 to-slate-900 rounded-2xl border border-emerald-500/30 shadow-glow-green overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-emerald-400"
              />
              <span className="text-emerald-400 text-sm font-semibold">Clocked In</span>
            </div>
            <span className="text-slate-400 text-xs">
              {clockInTime ? new Date(clockInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-800 text-2xl font-mono font-light tracking-widest">
                {formatElapsed(elapsed)}
              </p>
              {breakActive && (
                <p className="text-amber-400 text-xs mt-0.5 flex items-center gap-1">
                  <Pause size={10} /> On Break
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-slate-800 text-sm font-medium">{shift?.siteName ?? 'Grandview Heights Phase 3'}</p>
              <p className="text-slate-400 text-xs flex items-center gap-1 justify-end">
                <MapPin size={10} /> Zone A – Foundation
              </p>
            </div>
          </div>
        </div>

        <div className="flex border-t border-slate-200">
          <button
            onClick={breakActive ? endBreak : startBreak}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-amber-400 text-sm font-medium active:bg-white/5 transition-colors"
          >
            {breakActive ? <Play size={14} /> : <Pause size={14} />}
            {breakActive ? 'End Break' : 'Break'}
          </button>
          <div className="w-px bg-white/5" />
          <button
            onClick={onClockOut}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-red-400 text-sm font-medium active:bg-white/5 transition-colors"
          >
            <Square size={14} fill="currentColor" />
            Clock Out
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-surface rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">Today's Shift</p>
            <p className="text-slate-800 font-semibold">{shift?.siteName ?? 'Grandview Heights Phase 3'}</p>
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
              <Clock size={12} />
              {shift ? `${shift.startTime} – ${shift.endTime}` : '07:00 – 15:30'}
            </p>
          </div>
          <div className="bg-brand-amber/10 border border-brand-amber/20 rounded-xl px-3 py-1.5">
            <p className="text-brand-amber text-xs font-semibold">Scheduled</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onClockIn(isOvernightShift)}
        className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green active:bg-brand-greenDark transition-colors"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play size={18} fill="white" className="text-white ml-0.5" />
        </motion.div>
        <span className="text-white font-bold text-base">Clock In</span>
      </button>
    </motion.div>
  )
}
