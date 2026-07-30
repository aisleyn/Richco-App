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
  daysBack?: number
}

export function TimecardList({ isAdmin = false, onEditTimecard, daysBack = 7 }: TimecardListProps) {
  const [timecards, setTimecards] = useState<TimesheetEntry[]>([])

  useEffect(() => {
    const cards = getLocalTimecards()
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const recentCards = cards.filter(tc => tc.date >= cutoffDate).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setTimecards(recentCards)

    const handleStorageChange = () => {
      const updated = getLocalTimecards()
      const recentUpdated = updated.filter(tc => tc.date >= cutoffDate).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTimecards(recentUpdated)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [daysBack])

  function deleteTimecard(id: string) {
    if (!window.confirm('Are you sure you want to delete this timecard?')) return
    const updated = timecards.filter(t => t.id !== id)
    saveTimecards(updated)
    setTimecards(updated)
  }

  if (timecards.length === 0) {
    return (
      <div>
        <p className="text-secondary text-sm">No timecards yet. Clock out to create your first entry.</p>
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
            className={`bg-surface rounded-xl border p-4 ${tc.overtimeHours && tc.overtimeHours > 0 ? 'border-warning-base/20' : 'border-border-light'} group`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-primary text-sm font-medium">
                  {new Date(tc.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-secondary text-xs mt-0.5">{tc.siteName}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${tc.overtimeHours && tc.overtimeHours > 0 ? 'text-warning-base' : 'text-primary'}`}>
                  {tc.totalHours?.toFixed(2)}h
                </p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success-base/15 text-success-base">
                  Complete
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-secondary mb-3">
              <span>{fmt(tc.clockInTime)} – {tc.clockOutTime ? fmt(tc.clockOutTime) : '--'}</span>
              {tc.breakTaken
                ? <span className="text-success-base/60">Break ✓ {tc.breakMinutes}m</span>
                : <span className="text-error-base">No Break</span>
              }
              {tc.overtimeHours && tc.overtimeHours > 0 && (
                <span className="text-warning-base">+{tc.overtimeHours.toFixed(2)}h OT</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => onEditTimecard?.(tc)}
                  className="flex-1 px-2 py-1.5 bg-primary-base/10 hover:bg-primary-base/20 text-primary-base text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => deleteTimecard(tc.id)}
                  className="flex-1 px-2 py-1.5 bg-error-base/10 hover:bg-error-base/20 text-error-base text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
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
