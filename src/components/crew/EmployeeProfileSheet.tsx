import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Calendar, DollarSign, FileText, Award, AlertCircle, Image as ImageIcon, Edit2, Clock } from 'lucide-react'
import { EditEmployeeProfileModal } from './EditEmployeeProfileModal'
import { format } from 'date-fns'
import type { StoredCrewMember } from '../../services/crew'
import type { TimesheetEntry } from '../../types'

interface Props {
  member: StoredCrewMember
  onClose: () => void
  isAdmin: boolean
  onUpdated?: () => void
  canViewTimesheets?: boolean
}

export function EmployeeProfileSheet({ member, onClose, isAdmin, onUpdated, canViewTimesheets = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'timesheets'>('profile')
  const leaveData = member.leaveData || { annualAllowance: 20, used: 0, approved: 0, pending: 0 }
  const remaining = leaveData.annualAllowance - leaveData.used

  const employeeTimesheets = useMemo(() => {
    try {
      const storageKey = `richco-timesheets-${member.email.toLowerCase()}`
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }, [member.email])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:w-full sm:max-w-lg bg-bg-base rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-base border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-slate-900 text-2xl font-bold">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-slate-500 text-sm mt-1">{member.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit employee"
                >
                  <Edit2 size={20} />
                </button>
              )}
              <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {canViewTimesheets && (
            <div className="flex items-center gap-1 border-t border-slate-200 pt-3">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('timesheets')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'timesheets'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock size={16} />
                Timesheets
              </button>
            </div>
          )}
        </div>

        {activeTab === 'profile' && (
        <div className="px-6 py-6 space-y-4">
          {/* Profile Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-600/10 to-amber-500/5 rounded-2xl border border-blue-600/20 p-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Role</p>
                <p className="text-slate-900 font-semibold mt-1">{member.roleLabel}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pay Type</p>
                <p className="text-slate-900 font-semibold mt-1 capitalize">
                  {member.paymentType === 'hourly' ? 'Hourly' : 'Salary'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  {member.paymentType === 'hourly' ? 'Rate' : 'Salary'}
                </p>
                <p className="text-slate-900 font-semibold mt-1">
                  ${member.hourlyRate || member.salary || 'N/A'}
                  {member.paymentType === 'hourly' && '/hr'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Hire Date</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {member.hireDate ? new Date(member.hireDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Emergency Contact Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-bg-surface rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-slate-500" />
              <h2 className="text-slate-900 font-semibold">Emergency Contact</h2>
            </div>
            {member.emergencyContact ? (
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Name</p>
                  <p className="text-slate-800 mt-1">{member.emergencyContact.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Relationship</p>
                  <p className="text-slate-800 mt-1">{member.emergencyContact.relationship}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" />
                  <a href={`tel:${member.emergencyContact.phone}`} className="text-slate-800 hover:text-green-600 transition-colors">
                    {member.emergencyContact.phone}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No emergency contact on file</p>
            )}
          </motion.div>

          {/* Identification Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-surface rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={18} className="text-slate-500" />
              <h2 className="text-slate-900 font-semibold">Identification</h2>
            </div>
            {member.identification ? (
              <div className="space-y-3">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Type</p>
                  <p className="text-slate-800 mt-1 capitalize">
                    {member.identification.type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Document</p>
                  <a
                    href={member.identification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/10 hover:bg-green-600/20 border border-blue-600/30 rounded-lg text-green-600 text-sm font-medium transition-colors"
                  >
                    <ImageIcon size={14} /> View Document
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No identification on file</p>
            )}
          </motion.div>

          {/* Qualifications Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-surface rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} className="text-slate-500" />
              <h2 className="text-slate-900 font-semibold">Qualifications & Certifications</h2>
            </div>
            {member.qualifications && member.qualifications.length > 0 ? (
              <div className="space-y-3">
                {member.qualifications.map((qual, i) => (
                  <div key={i} className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-900 font-medium">{qual.name}</p>
                        {qual.expiryDate && (
                          <p className="text-slate-500 text-xs mt-1">
                            Expires: {new Date(qual.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {qual.expiryDate && new Date(qual.expiryDate) > new Date() && (
                        <span className="text-emerald-500 text-xs font-semibold">Valid</span>
                      )}
                      {qual.expiryDate && new Date(qual.expiryDate) <= new Date() && (
                        <span className="text-red-400 text-xs font-semibold">Expired</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No certifications on file</p>
            )}
          </motion.div>

          {/* Employment Files Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-surface rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-slate-500" />
              <h2 className="text-slate-900 font-semibold">Employment Files</h2>
            </div>
            {member.employmentFiles && member.employmentFiles.length > 0 ? (
              <div className="space-y-2">
                {member.employmentFiles.map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <FileText size={16} className="text-slate-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-medium truncate">{file.name}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(file.uploadedDate).toLocaleDateString()} • {file.type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No employment files on file</p>
            )}
          </motion.div>

          {/* Leave Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl border border-green-500/20 p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={18} className="text-blue-500" />
              <h2 className="text-slate-900 font-semibold">Leave Balance & Timeline</h2>
            </div>

            {/* Annual Allowance */}
            <div className="mb-6 pb-6 border-b border-green-500/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-600 text-sm font-medium">Annual Allowance</p>
                <p className="text-slate-900 font-bold text-lg">{leaveData.annualAllowance} days</p>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-full" />
              </div>
            </div>

            {/* Leave Breakdown */}
            <div className="space-y-3">
              {/* Used */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-600 text-sm">Used</p>
                  <p className="text-slate-900 font-semibold">{leaveData.used} days</p>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${(leaveData.used / leaveData.annualAllowance) * 100}%` }}
                  />
                </div>
              </div>

              {/* Approved */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-600 text-sm">Approved</p>
                  <p className="text-slate-900 font-semibold">{leaveData.approved} days</p>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${(leaveData.approved / leaveData.annualAllowance) * 100}%` }}
                  />
                </div>
              </div>

              {/* Pending */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-600 text-sm">Pending</p>
                  <p className="text-slate-900 font-semibold">{leaveData.pending} days</p>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(leaveData.pending / leaveData.annualAllowance) * 100}%` }}
                  />
                </div>
              </div>

              {/* Remaining */}
              <div className="pt-2 border-t border-green-500/10">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600 text-sm font-semibold">Remaining</p>
                  <p className={`font-bold text-lg ${remaining > 5 ? 'text-emerald-500' : remaining > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                    {remaining} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        )}

        {activeTab === 'timesheets' && (
        <div className="px-6 py-6 space-y-4">
          {employeeTimesheets.length > 0 ? (
            <div className="space-y-3">
              {employeeTimesheets.map((entry: TimesheetEntry) => {
                const clockInDate = new Date(entry.clockInTime)
                const hours = entry.totalHours || 0

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg-surface rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-slate-900 font-semibold">{entry.siteName}</p>
                        <p className="text-slate-500 text-sm">{format(clockInDate, 'MMM d, yyyy')}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        entry.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                        entry.status === 'flagged' ? 'bg-red-500/10 text-red-600' :
                        entry.status === 'complete' ? 'bg-blue-500/10 text-green-600' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider">Clock In</p>
                        <p className="text-slate-900 font-semibold text-sm mt-1">{format(clockInDate, 'h:mm a')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider">Hours</p>
                        <p className="font-semibold text-sm mt-1 text-slate-900">
                          {hours.toFixed(2)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider">Break</p>
                        <p className="text-slate-900 font-semibold text-sm mt-1">{entry.breakMinutes}m</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No timesheets recorded</p>
            </div>
          )}
        </div>
        )}

        <AnimatePresence>
          {editing && (
            <EditEmployeeProfileModal
              member={member}
              onClose={() => setEditing(false)}
              onUpdated={() => {
                setEditing(false)
                onUpdated?.()
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
