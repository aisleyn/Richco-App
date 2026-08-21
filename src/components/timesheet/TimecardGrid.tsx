import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { deleteTimeEntry } from '../../services/supabase'
import type { TimesheetEntry } from '../../types'

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getLocalTimecards(userId: string): TimesheetEntry[] {
  try {
    const storageKey = `richco-completed-timecards-${userId}`
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveTimecards(timecards: TimesheetEntry[], userId: string) {
  try {
    const storageKey = `richco-completed-timecards-${userId}`
    localStorage.setItem(storageKey, JSON.stringify(timecards))
  } catch (err) {
    console.error('[Timecard] Failed to save timecards:', err)
  }
}

interface TimecardGridProps {
  isAdmin: boolean  // Required - only admins can delete
  onEditTimecard?: (timecard: TimesheetEntry) => void
  onViewTimecard?: (timecard: TimesheetEntry) => void
  selectedDate?: Date
}

export function TimecardGrid({ isAdmin = false, onEditTimecard, onViewTimecard, selectedDate }: TimecardGridProps) {
  const { currentUserId } = useAppStore()
  const [allTimecards, setAllTimecards] = useState<TimesheetEntry[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFullMonth, setShowFullMonth] = useState(false)

  useEffect(() => {
    if (!currentUserId) return
    const cards = getLocalTimecards(currentUserId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setAllTimecards(cards)

    const handleStorageChange = () => {
      const updated = getLocalTimecards(currentUserId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setAllTimecards(updated)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [currentUserId])

  const getCardsByDateRange = (daysBack: number, baseDate: Date) => {
    const cutoffDate = new Date(baseDate.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = baseDate.toISOString().split('T')[0]
    return allTimecards.filter(tc => tc.date >= cutoffDate && tc.date <= endDate)
  }

  const baseDate = selectedDate || new Date()
  const weekCards = getCardsByDateRange(7, baseDate)
  const monthCards = getCardsByDateRange(30, baseDate)
  const displayCards = showFullMonth ? monthCards : weekCards

  async function deleteTimecard(id: string) {
    if (!window.confirm('Are you sure you want to delete this timecard?')) return

    try {
      // Delete from Supabase time_entries table (for Power Automate)
      const deletedFromSupabase = await deleteTimeEntry(id)

      // Delete from localStorage immediately regardless of Supabase result
      const updated = allTimecards.filter(t => t.id !== id)
      saveTimecards(updated, currentUserId)
      setAllTimecards(updated)
      console.log('[TimecardGrid] Deleted timecard from both localStorage and Supabase:', id)
    } catch (err) {
      console.error('[TimecardGrid] Error deleting timecard:', err)
    }
  }

  if (allTimecards.length === 0) {
    return (
      <div>
        <p className="text-slate-500 text-sm">No timecards yet. Clock out to create your first entry.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with expand/collapse toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {showFullMonth ? 'Month History' : 'Week History'}
        </h3>
        <button
          onClick={() => setShowFullMonth(!showFullMonth)}
          className="flex items-center gap-1 text-green-600 hover:text-green-500 text-xs font-semibold transition-colors"
        >
          {showFullMonth ? (
            <>
              <ChevronUp size={14} /> Collapse to Week
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Expand to Month
            </>
          )}
        </button>
      </div>

      {/* 3-column grid of timecard cards */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {displayCards.map((tc, i) => (
            <motion.div
              key={tc.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (onViewTimecard) {
                  onViewTimecard(tc)
                } else {
                  setExpandedId(expandedId === tc.id ? null : tc.id)
                }
              }}
              className="cursor-pointer"
            >
              <motion.div
                className={`bg-bg-surface dark:bg-bg-surface-dark rounded-xl border p-3 transition-all shadow-md ${
                  expandedId === tc.id
                    ? 'border-green-500 ring-2 ring-green-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Collapsed view - just date and hours */}
                <motion.div
                  initial={false}
                  animate={{ height: expandedId === tc.id ? 'auto' : 'auto' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-slate-100 text-sm font-semibold">
                        {new Date(tc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {new Date(tc.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {tc.totalHours?.toFixed(2)}h
                      </p>
                    </div>
                  </div>

                  {/* Expanded view - full details */}
                  <AnimatePresence>
                    {expandedId === tc.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="space-y-1.5 text-xs">
                          <p className="text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">{tc.siteName}</span>
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {fmt(tc.clockInTime)} – {tc.clockOutTime ? fmt(tc.clockOutTime) : '--'}
                          </p>
                          <div className="flex items-center gap-2">
                            {tc.breakTaken ? (
                              <span className="text-emerald-500/60 font-semibold">✓ Break {tc.breakMinutes}m</span>
                            ) : (
                              <span className="text-red-400 font-semibold">No Break</span>
                            )}
                          </div>
                        </div>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditTimecard?.(tc)
                              }}
                              className="flex-1 px-2 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTimecard(tc.id)
                              }}
                              className="flex-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {displayCards.length === 0 && (
        <p className="text-slate-500 text-sm">No timecards for this period.</p>
      )}
    </div>
  )
}
