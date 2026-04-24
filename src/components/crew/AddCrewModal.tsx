import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader } from 'lucide-react'
import { addCrewMember } from '../../services/crew'

interface Props {
  onClose: () => void
  onCrewAdded: () => void
}

export function AddCrewModal({ onClose, onCrewAdded }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'field' as const,
    phone: '',
    isAdmin: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.firstName.trim()) throw new Error('First name is required')
      if (!formData.lastName.trim()) throw new Error('Last name is required')
      if (!formData.email.trim()) throw new Error('Email is required')
      if (!formData.email.includes('@')) throw new Error('Enter a valid email address')

      addCrewMember({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
        isAdmin: formData.isAdmin,
      })

      setFormData({ firstName: '', lastName: '', email: '', role: 'field', phone: '', isAdmin: false })
      onCrewAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add crew member')
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
          <h2 className="text-slate-900 text-xl font-bold">Add Crew Member</h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
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
                placeholder="Doe"
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@richcogroup.com"
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
            />
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
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Role
            </label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            >
              <option value="field">Field Worker</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrator</option>
              <option value="ceo">CEO</option>
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
              Add Member
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
