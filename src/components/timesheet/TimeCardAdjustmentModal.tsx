import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface TimeEntry {
  id: string
  employee_name: string
  site_name: string
  total_hours?: number
  regular_hours?: number
  overtime_hours?: number
  break_hours?: number
}

interface TimeCardAdjustmentModalProps {
  timeEntry: TimeEntry
  onSave: (adjustedHours: number, note: string) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
}

export function TimeCardAdjustmentModal({
  timeEntry,
  onSave,
  onCancel,
  isSaving = false,
}: TimeCardAdjustmentModalProps) {
  const [adjustedHours, setAdjustedHours] = useState<number>(timeEntry.total_hours || 0)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // Auto-calculate based on adjusted hours
  // NOTE: Overtime is calculated WEEKLY (not daily) - no daily overtime calculation here
  const breakHours = timeEntry.break_hours || 0
  const workHours = Math.max(0, adjustedHours - breakHours)

  const handleSave = async () => {
    if (adjustedHours < 0) {
      setError('Hours cannot be negative')
      return
    }

    if (!note.trim()) {
      setError('Please provide a reason for adjustment')
      return
    }

    try {
      await onSave(adjustedHours, note)
    } catch (err) {
      setError((err as Error).message || 'Failed to save adjustment')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Adjust Hours
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {timeEntry.employee_name} • {timeEntry.site_name}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Original vs Adjusted */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Original
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {timeEntry.total_hours?.toFixed(2)}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Regular: {timeEntry.regular_hours?.toFixed(2)}h
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Adjusted
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {adjustedHours.toFixed(2)}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Work Hours: {workHours.toFixed(2)}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              (Overtime calculated weekly)
            </p>
          </div>
        </div>

        {/* Break Hours (Read-only) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
            Break Hours (Unchanged)
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {breakHours.toFixed(2)}h
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Breaks are not adjusted. Work hours calculated as: Total Hours - Break Hours
          </p>
        </div>

        {/* Adjusted Hours Input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Adjusted Total Hours
          </label>
          <input
            type="number"
            value={adjustedHours}
            onChange={(e) => {
              setAdjustedHours(parseFloat(e.target.value) || 0)
              setError('')
            }}
            step="0.25"
            min="0"
            max="24"
            className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-white"
            disabled={isSaving}
          />
        </div>

        {/* Adjustment Reason */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Reason for Adjustment
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setError('')
            }}
            placeholder="e.g., Employee worked off-clock, system error, late break..."
            className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-white resize-none h-24"
            disabled={isSaving}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
