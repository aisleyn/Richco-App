import { motion } from 'framer-motion'
import type { TimesheetEntry } from '../../types'

const mockTimecards: TimesheetEntry[] = [
  { id: 'tc1', date: '2026-04-08', siteName: 'Grandview Heights Phase 3', siteId: 'site1', clockInTime: new Date('2026-04-08T07:02:00').getTime(), clockOutTime: new Date('2026-04-08T15:28:00').getTime(), breakMinutes: 30, totalHours: 7.93, overtimeHours: 0, status: 'approved', breakTaken: true },
  { id: 'tc2', date: '2026-04-07', siteName: 'Port Kells Industrial', siteId: 'site2', clockInTime: new Date('2026-04-07T06:31:00').getTime(), clockOutTime: new Date('2026-04-07T15:45:00').getTime(), breakMinutes: 30, totalHours: 8.73, overtimeHours: 0.73, status: 'approved', breakTaken: true },
  { id: 'tc3', date: '2026-04-04', siteName: 'Grandview Heights Phase 3', siteId: 'site1', clockInTime: new Date('2026-04-04T07:00:00').getTime(), clockOutTime: new Date('2026-04-04T15:30:00').getTime(), breakMinutes: 30, totalHours: 8.0, overtimeHours: 0, status: 'approved', breakTaken: true },
  { id: 'tc4', date: '2026-04-03', siteName: 'Clayton Townhomes', siteId: 'site3', clockInTime: new Date('2026-04-03T07:15:00').getTime(), clockOutTime: new Date('2026-04-03T16:00:00').getTime(), breakMinutes: 30, totalHours: 8.25, overtimeHours: 0.25, status: 'complete', breakTaken: true },
  { id: 'tc5', date: '2026-04-02', siteName: 'Port Kells Industrial', siteId: 'site2', clockInTime: new Date('2026-04-02T06:45:00').getTime(), clockOutTime: new Date('2026-04-02T17:15:00').getTime(), breakMinutes: 30, totalHours: 10.0, overtimeHours: 2.0, status: 'flagged', breakTaken: false },
]

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function TimecardList() {
  return (
    <div>
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Recent Timecards</h3>
      <div className="space-y-2">
        {mockTimecards.map((tc, i) => (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-bg-surface rounded-xl border p-4 ${tc.overtimeHours && tc.overtimeHours > 0 ? 'border-amber-500/20' : 'border-white/5'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white text-sm font-medium">
                  {new Date(tc.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{tc.siteName}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${tc.overtimeHours && tc.overtimeHours > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {tc.totalHours?.toFixed(2)}h
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  tc.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                  tc.status === 'flagged' ? 'bg-red-500/15 text-red-400' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{fmt(tc.clockInTime)} – {tc.clockOutTime ? fmt(tc.clockOutTime) : '--'}</span>
              {tc.breakTaken
                ? <span className="text-emerald-500/60">Break ✓</span>
                : <span className="text-red-400">No Break</span>
              }
              {tc.overtimeHours && tc.overtimeHours > 0 && (
                <span className="text-amber-400">+{tc.overtimeHours.toFixed(2)}h OT</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
