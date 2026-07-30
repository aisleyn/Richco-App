import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader, AlertCircle } from 'lucide-react'
import { addCrewMember } from '../../services/crew'

interface Props {
  email: string
  displayName: string
  onComplete: () => void
}

export function RegistrationModal({ email, displayName, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(() => {
    const parts = displayName.split(' ')
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      phone: '',
    }
  })

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.firstName.trim()) throw new Error('First name is required')

      await addCrewMember({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email,
        role: 'field',
        phone: formData.phone.trim(),
      })

      console.log('[Registration] User registered:', email)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-bg-base rounded-2xl p-6 shadow-2xl border border-slate-200"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Richco</h1>
          <p className="text-slate-600">Complete your crew profile to get started</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="flex gap-2 bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-600 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">Email</label>
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 text-sm">
              {email}
            </div>
            <p className="text-xs text-slate-500 mt-1">Your Microsoft account email</p>
          </div>

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-slate-700 text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 000-0000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Setting up your profile...
              </>
            ) : (
              'Complete Registration'
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            You can update your profile details later in the crew section
          </p>
        </form>
      </motion.div>
    </motion.div>
  )
}
