import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader } from 'lucide-react'
import { jobSites } from '../../data/mockData'
import type { TimesheetEntry } from '../../types'

interface Props {
  timecard: TimesheetEntry
  onClose: () => void
  onSave: (timecard: TimesheetEntry) => void
}

export function EditTimecardModal({ timecard, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    siteName: timecard.siteName,
    siteId: timecard.siteId,
    clockInTime: new Date(timecard.clockInTime).toISOString().slice(0, 16),
    clockOutTime: timecard.clockOutTime ? new Date(timecard.clockOutTime).toISOString().slice(0, 16) : '',
    breakMinutes: timecard.breakMinutes?.toString() ?? '0',
    totalHours: timecard.totalHours?.toString() ?? '0',
  })

  function handleSiteChange(siteId: string) {
    const site = jobSites.find(s => s.id === siteId)
    if (site) {
      setFormData({ ...formData, siteId, siteName: site.name })
    }
  }

  function handleSave() {
    setLoading(true)
    try {
      const updated: TimesheetEntry = {
        ...timecard,
        siteName: formData.siteName,
        siteId: formData.siteId,
        clockInTime: new Date(formData.clockInTime).getTime(),
        clockOutTime: formData.clockOutTime ? new Date(formData.clockOutTime).getTime() : undefined,
        breakMinutes: parseInt(formData.breakMinutes) || 0,
        totalHours: parseFloat(formData.totalHours) || 0,
      }
      onSave(updated)
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
        className="w-full sm:w-full sm:max-w-md bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold">Edit Timecard</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Site Name */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Site
            </label>
            <select
              value={formData.siteId}
              onChange={e => handleSiteChange(e.target.value)}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            >
              {jobSites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clock In */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Clock In
            </label>
            <input
              type="datetime-local"
              value={formData.clockInTime}
              onChange={e => setFormData({ ...formData, clockInTime: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          {/* Clock Out */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Clock Out
            </label>
            <input
              type="datetime-local"
              value={formData.clockOutTime}
              onChange={e => setFormData({ ...formData, clockOutTime: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          {/* Break Minutes */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Break Minutes
            </label>
            <input
              type="number"
              value={formData.breakMinutes}
              onChange={e => setFormData({ ...formData, breakMinutes: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          {/* Total Hours */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Total Hours
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.totalHours}
              onChange={e => setFormData({ ...formData, totalHours: e.target.value })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-brand-amber hover:bg-amber-500 disabled:opacity-50 rounded-lg px-4 py-2.5 text-slate-900 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
