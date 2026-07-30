import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle, Mail, Lock } from 'lucide-react'
import { login } from '../services/supabaseAuth'

interface Props {
  onLoginSuccess: () => void
  onForgotPassword: () => void
}

export function LoginScreen({ onLoginSuccess, onForgotPassword }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const user = await login(email, password)
      if (user) {
        console.log('[LoginScreen] Login successful:', user.email)
        onLoginSuccess()
      } else {
        setError('Invalid email or password')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
      console.error('[LoginScreen] Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-base to-bg-surface flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-600/15 border border-blue-600/30 flex items-center justify-center mx-auto mb-4">
            <div className="text-3xl font-bold text-green-600">RC</div>
          </div>
          <h1 className="text-slate-800 dark:text-slate-100 text-3xl font-bold">Richco Construction</h1>
          <p className="text-slate-400 text-sm mt-2">Field Operations App</p>
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

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
              Email
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

          {/* Password input */}
          <div>
            <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 active:bg-blue-800 disabled:opacity-50 transition-all rounded-lg text-white font-semibold text-base"
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Forgot password link */}
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="w-full mt-3 text-green-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            Forgot password?
          </button>
        </form>

        {/* Help text */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            <strong>Don't have an account?</strong> Contact your admin to be added to the system.
          </p>
        </div>

        {/* Dev info */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Crew members are added by administrators only. Your email and profile are used to track timesheets and communications.
        </p>
      </motion.div>
    </div>
  )
}
