import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader, AlertCircle, CheckCircle, Lock } from 'lucide-react'
import { updatePassword } from '../../services/supabaseAuth'

interface Props {
  email: string
  onComplete: () => void
}

export function SetPasswordModal({ email, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!password.trim()) {
      setError('Password is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const result = await updatePassword(password)
      if (result.success) {
        console.log('[SetPassword] Password set successfully')
        setSuccess(true)
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        setError(result.message || 'Failed to set password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base to-bg-surface flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        {!success ? (
          <div className="bg-bg-base rounded-2xl p-8 shadow-2xl border border-slate-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Your Password</h1>
              <p className="text-slate-600">Set a secure password for your account</p>
            </div>

            {error && (
              <div className="flex gap-2 bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-600 text-sm mb-6">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">Email</label>
                <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 text-sm">
                  {email}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-2">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Setting password...
                  </>
                ) : (
                  'Set Password'
                )}
              </button>
            </form>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-base rounded-2xl p-8 shadow-2xl border border-slate-200 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle size={32} className="text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Set!</h2>
            <p className="text-slate-600">Redirecting to login...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
