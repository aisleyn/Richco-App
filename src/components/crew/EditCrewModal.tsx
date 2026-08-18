import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader, Trash2 } from 'lucide-react'
import { updateCrewMember, removeCrewMember } from '../../services/crew'
import type { StoredCrewMember } from '../../services/crew'

interface Props {
  member: StoredCrewMember
  onClose: () => void
  onUpdated: () => void
}

export function EditCrewModal({ member, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    role: member.role,
    isAdmin: member.isAdmin,
    hireDate: member.hireDate || '',
    paymentType: member.paymentType || 'hourly',
    hourlyRate: member.hourlyRate || 0,
    salary: member.salary || 0,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.firstName.trim()) throw new Error('First name is required')
      if (!formData.lastName.trim()) throw new Error('Last name is required')

      const roleLabels: Record<string, string> = {
        site_employee: 'Site Employee',
        office_staff: 'Office Staff',
        leadership: 'Leadership',
      }

      const result = await updateCrewMember(member.email, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        roleLabel: roleLabels[formData.role] || formData.role,
        isAdmin: formData.isAdmin,
        hireDate: formData.hireDate,
        paymentType: formData.paymentType,
        hourlyRate: formData.paymentType === 'hourly' ? formData.hourlyRate : undefined,
        salary: formData.paymentType === 'salary' ? formData.salary : undefined,
      })

      if (!result) {
        throw new Error('Failed to update crew member')
      }

      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update crew member')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const success = await removeCrewMember(member.email)
      if (!success) {
        setError('Failed to delete crew member')
        setLoading(false)
        return
      }
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete crew member')
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
          <h2 className="text-slate-900 text-xl font-bold">Edit Crew Member</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-4">
              <p className="text-slate-800 text-sm font-medium">
                Delete {member.firstName} {member.lastName}?
              </p>
              <p className="text-slate-600 text-xs mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 rounded-lg px-4 py-2.5 text-red-400 font-medium text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Email
              </label>
              <div className="w-full bg-bg-elevated border border-slate-200 rounded-lg px-3 py-2.5 text-slate-600 text-sm">
                {member.email}
              </div>
              <p className="text-slate-500 text-xs mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(604) 555-0000"
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-600"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Role
              </label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-600"
              >
                <option value="site_employee">Site Employee</option>
                <option value="office_staff">Office Staff</option>
                <option value="leadership">Leadership</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-bg-surface rounded-lg p-3 border border-slate-200">
              <input
                type="checkbox"
                id="isAdmin"
                checked={formData.isAdmin}
                onChange={e => setFormData({ ...formData, isAdmin: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="isAdmin" className="flex-1 text-slate-800 text-sm font-medium cursor-pointer">
                Grant admin privileges
              </label>
            </div>

            {/* Employment Details Section */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">Employment Details</h3>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={e => setFormData({ ...formData, hireDate: e.target.value })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block mt-3">
                  Payment Type
                </label>
                <select
                  value={formData.paymentType}
                  onChange={e => setFormData({ ...formData, paymentType: e.target.value as any })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-green-600"
                >
                  <option value="hourly">Hourly</option>
                  <option value="salary">Salary</option>
                </select>
              </div>

              {formData.paymentType === 'hourly' ? (
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block mt-3">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={e => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block mt-3">
                    Annual Salary ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-600"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 bg-red-500/15 border border-red-500/30 hover:bg-red-500/20 rounded-lg px-4 py-2.5 text-red-400 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg px-4 py-2.5 text-slate-900 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}
