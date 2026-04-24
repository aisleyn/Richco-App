import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader, Calendar } from 'lucide-react'
import { requestTimeOff, calculateDays } from '../../services/timeoff'
import { useAppStore } from '../../store/appStore'
import type { LeaveType } from '../../services/timeoff'

interface Props {
  onClose: () => void
  onRequestSubmitted: () => void
}

export function RequestTimeOffModal({ onClose, onRequestSubmitted }: Props) {
  const { currentUserEmail, currentUserName, refreshLeaveRequestAlerts } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    leaveType: 'vacation' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  })

  const totalDays = formData.startDate && formData.endDate ? calculateDays(formData.startDate, formData.endDate) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.startDate) throw new Error('Start date is required')
      if (!formData.endDate) throw new Error('End date is required')
      if (formData.endDate < formData.startDate) throw new Error('End date must be after start date')
      if (!formData.reason.trim()) throw new Error('Reason is required')

      requestTimeOff({
        employeeEmail: currentUserEmail,
        employeeName: currentUserName,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      }, refreshLeaveRequestAlerts)

      onRequestSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  const leaveTypes: { value: LeaveType; label: string; emoji: string }[] = [
    { value: 'vacation', label: 'Vacation Leave', emoji: '🏖️' },
    { value: 'sick', label: 'Sick Leave', emoji: '🤒' },
    { value: 'personal', label: 'Personal Leave', emoji: '👤' },
    { value: 'bereavement', label: 'Bereavement Leave', emoji: '🕯️' },
    { value: 'other', label: 'Other', emoji: '📋' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:w-full sm:max-w-md bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold flex items-center gap-2">
            <Calendar size={20} />
            Request Time Off
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 block">
              Type of Leave
            </label>
            <div className="grid grid-cols-2 gap-2">
              {leaveTypes.map(type => (
                <label
                  key={type.value}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.leaveType === type.value
                      ? 'border-brand-amber bg-brand-amber/10'
                      : 'border-slate-200 bg-bg-surface hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="leaveType"
                    value={type.value}
                    checked={formData.leaveType === type.value}
                    onChange={() => setFormData({ ...formData, leaveType: type.value })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <p className="text-2xl mb-1">{type.emoji}</p>
                    <p className="text-xs font-semibold text-slate-800">{type.label.split(' ')[0]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
              />
            </div>
          </div>

          {/* Total Days */}
          {totalDays > 0 && (
            <div className="bg-brand-amber/10 border border-brand-amber/30 rounded-lg p-4">
              <p className="text-slate-600 text-sm font-medium">Total Days</p>
              <p className="text-3xl font-bold text-brand-amber mt-1">{totalDays}</p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a reason for your time-off request..."
              rows={4}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-amber hover:bg-amber-500 disabled:opacity-50 rounded-lg px-4 py-2.5 text-slate-900 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
