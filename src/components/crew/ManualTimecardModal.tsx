import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader } from 'lucide-react'
import { getAllCrew } from '../../services/crew'
import type { TimesheetEntry } from '../../types'

interface Props {
  onClose: () => void
  onTimecardCreated: () => void
}

export function ManualTimecardModal({ onClose, onTimecardCreated }: Props) {
  const crew = getAllCrew()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    employeeEmail: '',
    date: new Date().toISOString().split('T')[0],
    clockInTime: '07:00',
    clockOutTime: '15:30',
    breakMinutes: 30,
    siteName: '',
    vehicleUsed: '',
    shiftSummary: '',
    concerns: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.employeeEmail) throw new Error('Employee is required')
      if (!formData.date) throw new Error('Date is required')
      if (!formData.clockInTime) throw new Error('Clock in time is required')
      if (!formData.clockOutTime) throw new Error('Clock out time is required')

      const [inHour, inMin] = formData.clockInTime.split(':').map(Number)
      const [outHour, outMin] = formData.clockOutTime.split(':').map(Number)

      const clockInTime = new Date(`${formData.date}T${formData.clockInTime}:00`).getTime()
      const clockOutTime = new Date(`${formData.date}T${formData.clockOutTime}:00`).getTime()

      if (clockOutTime <= clockInTime) {
        throw new Error('Clock out time must be after clock in time')
      }

      const totalMs = clockOutTime - clockInTime
      const totalHours = totalMs / 3600000
      const overtimeHours = Math.max(0, totalHours - formData.breakMinutes / 60 - 8)

      const timecard: TimesheetEntry = {
        id: `manual-${Date.now()}`,
        date: formData.date,
        siteName: formData.siteName || 'Manual Entry',
        siteId: '',
        clockInTime,
        clockOutTime,
        breakMinutes: formData.breakMinutes,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        status: 'complete',
        breakTaken: formData.breakMinutes > 0,
        vehicleUsed: formData.vehicleUsed,
        shiftSummary: formData.shiftSummary,
        concerns: formData.concerns,
      }

      // Save to employee's localStorage key
      const storageKey = `richco-timecards-${formData.employeeEmail}`
      const existing = localStorage.getItem(storageKey)
      const timecards: TimesheetEntry[] = existing ? JSON.parse(existing) : []
      timecards.unshift(timecard)
      localStorage.setItem(storageKey, JSON.stringify(timecards.slice(0, 30)))

      // Also add to main timecards list for current user view
      const mainKey = 'richco-completed-timecards'
      const mainExisting = localStorage.getItem(mainKey)
      const mainTimecards: TimesheetEntry[] = mainExisting ? JSON.parse(mainExisting) : []
      mainTimecards.unshift({ ...timecard, id: `manual-${formData.employeeEmail}-${Date.now()}` })
      localStorage.setItem(mainKey, JSON.stringify(mainTimecards.slice(0, 30)))

      console.log('[Manual Timecard] Created:', timecard)
      onTimecardCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create timecard')
    } finally {
      setLoading(false)
    }
  }

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
        className="w-full sm:w-full sm:max-w-md bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold">Manual Timecard Entry</h2>
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

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Employee
            </label>
            <select
              value={formData.employeeEmail}
              onChange={e => setFormData({ ...formData, employeeEmail: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            >
              <option value="">Select an employee...</option>
              {crew.map(member => (
                <option key={member.email} value={member.email}>
                  {member.firstName} {member.lastName} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Clock In
              </label>
              <input
                type="time"
                value={formData.clockInTime}
                onChange={e => setFormData({ ...formData, clockInTime: e.target.value })}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Clock Out
              </label>
              <input
                type="time"
                value={formData.clockOutTime}
                onChange={e => setFormData({ ...formData, clockOutTime: e.target.value })}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Break Minutes
            </label>
            <input
              type="number"
              min="0"
              max="480"
              value={formData.breakMinutes}
              onChange={e => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Site Name
            </label>
            <input
              type="text"
              value={formData.siteName}
              onChange={e => setFormData({ ...formData, siteName: e.target.value })}
              placeholder="e.g., Grandview Heights Phase 3"
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Vehicle Used
            </label>
            <input
              type="text"
              value={formData.vehicleUsed}
              onChange={e => setFormData({ ...formData, vehicleUsed: e.target.value })}
              placeholder="e.g., F-350 #1"
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Shift Summary
            </label>
            <textarea
              value={formData.shiftSummary}
              onChange={e => setFormData({ ...formData, shiftSummary: e.target.value })}
              placeholder="What was accomplished..."
              rows={2}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber resize-none"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Concerns
            </label>
            <textarea
              value={formData.concerns}
              onChange={e => setFormData({ ...formData, concerns: e.target.value })}
              placeholder="Any safety or other concerns..."
              rows={2}
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
              Create Timecard
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
