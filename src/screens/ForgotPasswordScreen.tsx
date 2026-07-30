import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { requestPasswordReset } from '../services/supabaseAuth'

interface Props {
  onBackToLogin: () => void
}

export function ForgotPasswordScreen({ onBackToLogin }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError(null)

    const result = await requestPasswordReset(email)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.message || 'Failed to send reset email')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base to-bg-surface flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {!success ? (
          <>
            {/* Back button */}
            <button
              onClick={onBackToLogin}
              disabled={loading}
              className="flex items-center gap-2 text-green-600 hover:text-blue-700 text-sm font-medium mb-6 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-green-600/15 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-600" />
              </div>
              <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold">Reset Password</h1>
              <p className="text-slate-500 text-sm mt-2">Enter your email to receive a password reset link</p>
            </div>

            {/* Error alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/15 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3"
              >
                <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 active:bg-blue-800 disabled:opacity-50 transition-all rounded-lg text-white font-semibold text-base"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            {/* Help text */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                <strong>Check your email</strong> for a link to reset your password. The link will expire in 24 hours.
              </p>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle size={32} className="text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Check Your Email</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-slate-500 text-xs mb-6">Click the link in the email to set a new password.</p>
            <button
              onClick={onBackToLogin}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
            >
              Back to Login
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
