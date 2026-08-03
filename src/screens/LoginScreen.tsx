import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle, Mail, Lock, UserPlus } from 'lucide-react'
import { login, register } from '../services/supabaseAuth'

interface Props {
  onLoginSuccess: () => void
  onForgotPassword: () => void
}

export function LoginScreen({ onLoginSuccess, onForgotPassword }: Props) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isRegistering) {
        // Registration flow
        if (!email || !password || !firstName || !lastName) {
          setError('Please fill in all fields')
          setLoading(false)
          return
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }

        const result = await register(email, password, firstName, lastName)
        if (result.success) {
          setSuccess(result.message)
          // Reset form
          setEmail('')
          setPassword('')
          setFirstName('')
          setLastName('')
          // Switch back to login after 2 seconds
          setTimeout(() => {
            setIsRegistering(false)
            setSuccess(null)
          }, 2000)
        } else {
          setError(result.message)
        }
      } else {
        // Login flow
        if (!email || !password) {
          setError('Please enter email and password')
          setLoading(false)
          return
        }

        const user = await login(email, password)
        if (user) {
          console.log('[LoginScreen] Login successful:', user.email)
          onLoginSuccess()
        } else {
          setError('Invalid email or password')
        }
      }
    } catch (err) {
      setError('Operation failed. Please try again.')
      console.error('[LoginScreen] Error:', err)
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

        {/* Success alert */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/15 border border-green-500/30 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <AlertCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
            <p className="text-green-200 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Form mode indicator */}
        <div className="mb-6 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {/* Login / Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registration fields */}
          {isRegistering && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                  />
                </div>
              </div>
            </>
          )}

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
            {isRegistering && (
              <p className="text-slate-500 text-xs mt-1">Minimum 6 characters</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 active:bg-blue-800 disabled:opacity-50 transition-all rounded-lg text-white font-semibold text-base"
          >
            {isRegistering ? (
              <>
                <UserPlus size={18} />
                {loading ? 'Creating account...' : 'Create Account'}
              </>
            ) : (
              <>
                <LogIn size={18} />
                {loading ? 'Signing in...' : 'Sign In'}
              </>
            )}
          </button>

          {/* Toggle between login and registration */}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError(null)
              setSuccess(null)
              setEmail('')
              setPassword('')
              setFirstName('')
              setLastName('')
            }}
            disabled={loading}
            className="w-full mt-2 text-green-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>

          {/* Forgot password link - only show on login mode */}
          {!isRegistering && (
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={loading}
              className="w-full text-green-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </form>

        {/* Help text */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 text-xs">
            <strong>New user?</strong> Create an account above. An admin will assign your role and permissions.
          </p>
        </div>

        {/* Dev info */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Your email and profile are used to track timesheets and communications.
        </p>
      </motion.div>
    </div>
  )
}
