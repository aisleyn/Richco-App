import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Lock } from 'lucide-react'
import { requestPasswordResetCode, verifyPasswordResetCode } from '../services/supabaseAuth'

interface Props {
  onBackToLogin: () => void
}

export function ForgotPasswordScreen({ onBackToLogin }: Props) {
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError(null)

    const result = await requestPasswordResetCode(email)
    setLoading(false)

    if (result.success) {
      setStage('code')
    } else {
      setError(result.message || 'Failed to generate reset code')
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!code) {
      setError('Please enter the reset code')
      return
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter your new password')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    const result = await verifyPasswordResetCode(code, newPassword)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.message || 'Failed to reset password')
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
                {stage === 'email' ? (
                  <Mail size={32} className="text-green-600" />
                ) : (
                  <Lock size={32} className="text-green-600" />
                )}
              </div>
              <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold">Reset Password</h1>
              <p className="text-slate-500 text-sm mt-2">
                {stage === 'email'
                  ? 'Enter your email to receive a reset code'
                  : 'Enter the code and set your new password'}
              </p>
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

            {/* Email Stage */}
            {stage === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  {loading ? 'Generating code...' : 'Get Reset Code'}
                </button>
              </form>
            )}

            {/* Code Stage */}
            {stage === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="bg-blue-500/15 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-semibold mb-1">Check your email</p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">We've sent a 6-digit reset code to <strong>{email}</strong>. It expires in 15 minutes.</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                    Reset Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                  <p className="text-slate-500 text-xs mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 active:bg-blue-800 disabled:opacity-50 transition-all rounded-lg text-white font-semibold text-base"
                >
                  {loading ? 'Resetting password...' : 'Reset Password'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('email')
                    setCode('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setError(null)
                  }}
                  disabled={loading}
                  className="w-full py-2.5 text-green-600 hover:text-blue-700 font-semibold text-sm disabled:opacity-50"
                >
                  Use Different Email
                </button>
              </form>
            )}

            {/* Help text */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                <strong>Reset code will expire</strong> in 15 minutes. If you don't receive a code, check your email or try again.
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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Password Reset Successful</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Your password has been updated successfully
            </p>
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
