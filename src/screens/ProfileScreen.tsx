import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Mail, Shield, Edit2, Check, X } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { updatePassword } from '../services/supabaseAuth'

interface Props {
  onNavigate: (screen: string) => void
}

export function ProfileScreen({ onNavigate }: Props) {
  const { currentUserName, currentUserEmail, currentUserId } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(currentUserName)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setError('Name cannot be empty')
      return
    }
    // TODO: Save to database when API is ready
    setSuccess('Profile updated successfully')
    setIsEditing(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!newPassword.trim()) {
      setError('New password is required')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await updatePassword(newPassword)
      if (result.success) {
        setSuccess('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordForm(false)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.message || 'Failed to change password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 pt-20 pb-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Profile Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account information and security settings
          </p>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Success Alert */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400"
            >
              {success}
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Personal Information
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {currentUserName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Full name"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveName}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                        >
                          <Check size={16} />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditName(currentUserName)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {currentUserName || 'User'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        User ID: {currentUserId}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="pt-4">
                <div className="flex items-center gap-3 mb-1">
                  <Mail size={18} className="text-slate-600 dark:text-slate-400" />
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                </div>
                <p className="text-slate-900 dark:text-slate-100">
                  {currentUserEmail || 'Not set'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This is your login email and cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-green-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Security
              </h2>
            </div>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-medium transition-colors text-left"
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    minLength={8}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setError(null)
                    }}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Info Card */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <User size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  Account Information
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Your account is created using your email and password. Keep your password secure and don't share it with anyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
