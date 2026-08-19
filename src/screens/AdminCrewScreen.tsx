import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, AlertCircle, CheckCircle, Mail, Lock, Calendar, CheckSquare, Bell } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { createCrewMember, getAllCrewMembers, setPasswordDirect, User } from '../services/supabaseAuth'
import { removeCrewMember } from '../services/crew'
import { CreateShiftForm } from '../components/admin/CreateShiftForm'
import { CreateChecklistForm } from '../components/admin/CreateChecklistForm'
import { postNotification } from '../services/notificationService'
import { useAppStore } from '../store/appStore'

interface Props {
  onNavigate: (s: string) => void
}

export function AdminCrewScreen({ onNavigate }: Props) {
  const { currentUserEmail } = useAppStore()
  const [crews, setCrews] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null)
  const [selectedCrewName, setSelectedCrewName] = useState<string>('')
  const [newPassword, setNewPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [showCreateShift, setShowCreateShift] = useState(false)
  const [showCreateChecklist, setShowCreateChecklist] = useState(false)
  const [showPostNotification, setShowPostNotification] = useState(false)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'update' | 'alert' | 'announcement'>('update')
  const [postingNotification, setPostingNotification] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  function openDeleteConfirm(crew: User) {
    setDeleteTarget(crew)
    setShowDeleteConfirm(true)
  }

  async function confirmDeleteCrew() {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      console.log('[AdminCrew] Deleting crew member:', deleteTarget.email)
      const success = await removeCrewMember(deleteTarget.email)

      if (success) {
        setMessage({ type: 'success', text: `✅ ${deleteTarget.name} has been permanently deleted` })
        setShowDeleteConfirm(false)
        setDeleteTarget(null)
        await loadCrewMembers()
      } else {
        setMessage({ type: 'error', text: `❌ Failed to delete ${deleteTarget.name}` })
      }
    } catch (err) {
      console.error('[AdminCrew] Error deleting crew member:', err)
      setMessage({ type: 'error', text: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setIsDeleting(false)
    }
  }

  function cancelDeleteCrew() {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  function openPasswordModal(crew: User) {
    setSelectedCrewId(crew.id)
    setSelectedCrewName(crew.name)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCrewId || !newPassword) {
      setMessage({ type: 'error', text: 'Please enter a password' })
      return
    }

    setSettingPassword(true)
    const result = await setPasswordDirect(selectedCrewId, newPassword)
    setSettingPassword(false)

    if (result.success) {
      setMessage({ type: 'success', text: `Password set for ${selectedCrewName}` })
      setShowPasswordModal(false)
      setNewPassword('')
      setSelectedCrewId(null)
    } else {
      setMessage({ type: 'error', text: result.message })
    }
  }

  async function handlePostNotification(e: React.FormEvent) {
    e.preventDefault()
    console.log('[AdminCrew] Form submitted - title:', notificationTitle, 'message:', notificationMessage)
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      console.log('[AdminCrew] Form validation failed')
      setMessage({ type: 'error', text: 'Please enter title and message' })
      return
    }

    console.log('[AdminCrew] Starting notification post...')
    setPostingNotification(true)
    try {
      const result = await postNotification(
        notificationTitle.trim(),
        notificationMessage.trim(),
        currentUserEmail || 'Admin',
        notificationType
      )
      if (result) {
        setMessage({ type: 'success', text: 'Update posted successfully' })
        setShowPostNotification(false)
        setNotificationTitle('')
        setNotificationMessage('')
        setNotificationType('update')
      } else {
        setMessage({ type: 'error', text: 'Failed to post update' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to post update' })
    } finally {
      setPostingNotification(false)
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

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 flex flex-wrap gap-2"
        >
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Plus size={16} /> Add Crew Member
          </button>
          <button
            onClick={() => setShowCreateShift(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Calendar size={16} /> Create Shift
          </button>
          <button
            onClick={() => setShowCreateChecklist(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <CheckSquare size={16} /> Create Checklist
          </button>
          <button
            onClick={() => {
              console.log('[AdminCrew] Post Update button clicked - current state:', showPostNotification)
              setShowPostNotification(!showPostNotification)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <Bell size={16} /> Post Update
          </button>
        </motion.div>

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
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
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
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPasswordModal(crew)}
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-green-500/20 text-blue-500 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Lock size={12} /> Set Password
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(crew)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Set Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-base dark:bg-bg-base-dark rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6"
              >
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Set Password for {selectedCrewName}
                </h2>
                <p className="text-slate-500 text-sm mb-4">
                  Enter a new password. No email verification needed.
                </p>

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter password"
                      disabled={settingPassword}
                      className="w-full px-3 py-2 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={settingPassword || !newPassword}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                      {settingPassword ? 'Setting...' : 'Set Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      disabled={settingPassword}
                      className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Post Notification Form */}
        <AnimatePresence>
          {showPostNotification && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handlePostNotification}
              className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 space-y-4"
            >
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Post Update to Crew</h3>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="e.g., New Schedule Available"
                  disabled={postingNotification}
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter your message..."
                  disabled={postingNotification}
                  rows={3}
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-600 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
                  Type
                </label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value as 'update' | 'alert' | 'announcement')}
                  disabled={postingNotification}
                  className="w-full px-3 py-2 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-600 disabled:opacity-50"
                >
                  <option value="update">Update</option>
                  <option value="alert">Alert</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={postingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Bell size={14} />
                  {postingNotification ? 'Posting...' : 'Post Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPostNotification(false)}
                  disabled={postingNotification}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && deleteTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-bg-base dark:bg-bg-base-dark rounded-xl border border-red-200 dark:border-red-800 max-w-sm w-full p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="text-red-500" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Delete {deleteTarget.name}?
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                      This will permanently remove all their records, time entries, photos, and data.
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    ⚠️ This action <strong>cannot be undone</strong>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDeleteCrew}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-800 dark:text-slate-100 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCrew}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shift and Checklist Modals */}
        <CreateShiftForm
          isOpen={showCreateShift}
          onClose={() => setShowCreateShift(false)}
          onSuccess={() => loadCrewMembers()}
        />
        <CreateChecklistForm
          isOpen={showCreateChecklist}
          onClose={() => setShowCreateChecklist(false)}
          onSuccess={() => {}}
        />
      </div>
    </AppLayout>
  )
}
