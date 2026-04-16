import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle } from 'lucide-react'
import { login } from '../services/auth'

interface Props {
  onLoginSuccess: () => void
}

export function LoginScreen({ onLoginSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const user = await login()
    setLoading(false)

    if (user) {
      onLoginSuccess()
    } else {
      setError('Login failed. Please check your Azure AD configuration and try again.')
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
          <div className="w-16 h-16 rounded-2xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center mx-auto mb-4">
            <div className="text-3xl font-bold text-brand-amber">RC</div>
          </div>
          <h1 className="text-slate-800 text-3xl font-bold">Richco Construction</h1>
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

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-brand-amber active:bg-brand-amberDark disabled:opacity-50 transition-all rounded-xl text-slate-900 font-bold text-base"
        >
          <LogIn size={18} />
          {loading ? 'Signing in...' : 'Sign in with Microsoft'}
        </button>

        {/* Info text */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Sign in with your Richco company email. Your email is used to fetch crew information and link timesheets to your Azure AD identity.
        </p>

        {/* Dev mode fallback */}
        {!import.meta.env.VITE_AZURE_CLIENT_ID && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
          >
            <p className="text-yellow-200 text-xs mb-2 font-semibold">⚠️ Development Mode</p>
            <p className="text-yellow-300 text-xs">
              Azure AD not configured. Add <code className="bg-yellow-500/20 px-1.5 py-0.5 rounded">VITE_AZURE_CLIENT_ID</code> and <code className="bg-yellow-500/20 px-1.5 py-0.5 rounded">VITE_AZURE_TENANT_ID</code> to .env to enable live Dataverse sync.
            </p>
            <button
              onClick={onLoginSuccess}
              className="mt-3 w-full py-2 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium"
            >
              Continue with Mock Data
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
