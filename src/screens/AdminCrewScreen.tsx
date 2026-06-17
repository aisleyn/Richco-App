import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { createCrewMember, getAllCrewMembers, deleteCrewMember, User } from '../services/supabaseAuth'

interface Props {
  onNavigate: (s: string) => void
}

export function AdminCrewScreen({ onNavigate }: Props) {
  const [crews, setCrews] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadCrewMembers()
  }, [])

  async function loadCrewMembers() {
    setLoading(true)
    const crews = await getAllCrewMembers()
    setCrews(crews)
    setLoading(false)
  }

  async function handleAddCrew(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !name) {
      setMessage({ type: 'error', text: 'Please enter email and name' })
      return
    }

    setSubmitting(true)
    const result = await createCrewMember(email, name)
    setSubmitting(false)

    if (result.success) {
      setMessage({ type: 'success', text: result.message })
      setEmail('')
      setName('')
      setShowAddForm(false)
      await loadCrewMembers()
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }

  async function handleDeleteCrew(userId: string) {
    if (!window.confirm('Are you sure you want to delete this crew member?')) return

    const result = await deleteCrewMember(userId)
    if (result.success) {
      setMessage({ type: 'success', text: result.message })
      await loadCrewMembers()
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }

  return (
    <AppLayout>
      <div className="pt-14">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-slate-800 dark:text-slate-100 text-2xl font-bold">Manage Crew</h1>
          <p className="text-slate-500 text-sm mt-1">Add and manage crew members</p>
        </motion.div>

        {/* Message alert */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-4 p-4 rounded-lg border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30'
                  : 'bg-red-500/15 border-red-500/30'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              )}
              <p className={message.type === 'success' ? 'text-emerald-200' : 'text-red-200'} style={{ fontSize: '0.875rem' }}>
                {message.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add crew button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowAddForm(!showAddForm)}
          className="mt-5 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus size={16} /> Add Crew Member
        </motion.button>

        {/* Add crew form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCrew}
              className="mt-4 p-4 bg-bg-surface dark:bg-bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-700 space-y-4"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="crew@example.com"
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create & Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-xs">
                An email with setup instructions will be sent to the crew member.
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Crew list */}
        <div className="mt-6">
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Crew Members ({crews.length})
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          ) : crews.length === 0 ? (
            <p className="text-slate-500 text-sm">No crew members yet. Add one using the button above.</p>
          ) : (
            <div className="space-y-2">
              {crews.map((crew, i) => (
                <motion.div
                  key={crew.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-bg-surface dark:bg-bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-slate-800 dark:text-slate-100 font-semibold">{crew.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 mt-1">
                      <Mail size={12} /> {crew.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCrew(crew.id)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
