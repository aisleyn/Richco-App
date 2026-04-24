import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2 } from 'lucide-react'
import type { TimesheetEntry } from '../../types'

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getLocalTimecards(): TimesheetEntry[] {
  try {
    const stored = localStorage.getItem('richco-completed-timecards')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveTimecards(timecards: TimesheetEntry[]) {
  try {
    localStorage.setItem('richco-completed-timecards', JSON.stringify(timecards))
  } catch (err) {
    console.error('[Timecard] Failed to save timecards:', err)
  }
}

interface TimecardListProps {
  isAdmin?: boolean
  onEditTimecard?: (timecard: TimesheetEntry) => void
}

export function TimecardList({ isAdmin = false, onEditTimecard }: TimecardListProps) {
  const [timecards, setTimecards] = useState<TimesheetEntry[]>([])

  useEffect(() => {
    const cards = getLocalTimecards()
    const today = new Date().toISOString().split('T')[0]
    const todayCards = cards.filter(tc => tc.date === today)
    setTimecards(todayCards)

    const handleStorageChange = () => {
      setTimecards(getLocalTimecards())
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  function deleteTimecard(id: string) {
    if (!window.confirm('Are you sure you want to delete this timecard?')) return
    const updated = timecards.filter(t => t.id !== id)
    saveTimecards(updated)
    setTimecards(updated)
  }

  if (timecards.length === 0) {
    return (
      <div>
        <p className="text-slate-500 text-sm">No timecards yet. Clock out to create your first entry.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {timecards.map((tc, i) => (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-bg-surface rounded-xl border p-4 ${tc.overtimeHours && tc.overtimeHours > 0 ? 'border-amber-500/20' : 'border-slate-200'} group`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-slate-800 text-sm font-medium">
                  {new Date(tc.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{tc.siteName}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${tc.overtimeHours && tc.overtimeHours > 0 ? 'text-amber-400' : 'text-slate-800'}`}>
                  {tc.totalHours?.toFixed(2)}h
                </p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                  Complete
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
              <span>{fmt(tc.clockInTime)} – {tc.clockOutTime ? fmt(tc.clockOutTime) : '--'}</span>
              {tc.breakTaken
                ? <span className="text-emerald-500/60">Break ✓ {tc.breakMinutes}m</span>
                : <span className="text-red-400">No Break</span>
              }
              {tc.overtimeHours && tc.overtimeHours > 0 && (
                <span className="text-amber-400">+{tc.overtimeHours.toFixed(2)}h OT</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEditTimecard?.(tc)}
                  className="flex-1 px-2 py-1.5 bg-brand-amber/10 hover:bg-brand-amber/20 text-brand-amber text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => deleteTimecard(tc.id)}
                  className="flex-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
