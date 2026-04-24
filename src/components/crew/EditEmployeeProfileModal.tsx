import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader, Plus, Trash2 } from 'lucide-react'
import { updateCrewMember } from '../../services/crew'
import type { StoredCrewMember, EmergencyContact, Qualification, EmploymentFile, LeaveData } from '../../services/crew'

interface Props {
  member: StoredCrewMember
  onClose: () => void
  onUpdated: () => void
}

export function EditEmployeeProfileModal({ member, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'emergency' | 'qualifications' | 'files' | 'leave'>('personal')

  const [personal, setPersonal] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
  })

  const [employment, setEmployment] = useState({
    role: member.role as const,
    paymentType: (member.paymentType || 'hourly') as 'hourly' | 'salary',
    hourlyRate: member.hourlyRate || 0,
    salary: member.salary || 0,
    hireDate: member.hireDate || '',
  })

  const [emergency, setEmergency] = useState<EmergencyContact>(
    member.emergencyContact || { name: '', relationship: '', phone: '' }
  )

  const [qualifications, setQualifications] = useState<Qualification[]>(member.qualifications || [])
  const [newQual, setNewQual] = useState({ name: '', expiryDate: '' })

  const [employmentFiles, setEmploymentFiles] = useState<EmploymentFile[]>(member.employmentFiles || [])

  const [leave, setLeave] = useState<LeaveData>(
    member.leaveData || { annualAllowance: 20, used: 0, approved: 0, pending: 0 }
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!personal.firstName.trim()) throw new Error('First name is required')
      if (!personal.lastName.trim()) throw new Error('Last name is required')

      const roleLabels: Record<string, string> = {
        field: 'Field Worker',
        supervisor: 'Supervisor',
        admin: 'Administrator',
        ceo: 'CEO',
      }

      updateCrewMember(member.email, {
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        phone: personal.phone,
        role: employment.role,
        roleLabel: roleLabels[employment.role],
        paymentType: employment.paymentType,
        hourlyRate: employment.paymentType === 'hourly' ? employment.hourlyRate : undefined,
        salary: employment.paymentType === 'salary' ? employment.salary : undefined,
        hireDate: employment.hireDate,
        emergencyContact: emergency.name ? emergency : undefined,
        qualifications: qualifications.length > 0 ? qualifications : undefined,
        employmentFiles: employmentFiles.length > 0 ? employmentFiles : undefined,
        leaveData: leave,
      })

      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'qualifications', label: 'Qualifications' },
    { id: 'files', label: 'Files' },
    { id: 'leave', label: 'Leave' },
  ] as const

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
        className="w-full sm:w-full sm:max-w-2xl bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold">
            Edit {member.firstName} {member.lastName}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-amber text-slate-900'
                  : 'bg-bg-surface border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={personal.firstName}
                    onChange={e => setPersonal({ ...personal, firstName: e.target.value })}
                    className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={personal.lastName}
                    onChange={e => setPersonal({ ...personal, lastName: e.target.value })}
                    className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Email
                </label>
                <div className="w-full bg-bg-elevated border border-slate-200 rounded-lg px-3 py-2.5 text-slate-600 text-sm">
                  {member.email}
                </div>
                <p className="text-slate-500 text-xs mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Phone
                </label>
                <input
                  type="tel"
                  value={personal.phone}
                  onChange={e => setPersonal({ ...personal, phone: e.target.value })}
                  placeholder="(604) 555-0000"
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                />
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Role
                </label>
                <select
                  value={employment.role}
                  onChange={e => setEmployment({ ...employment, role: e.target.value as any })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                >
                  <option value="field">Field Worker</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrator</option>
                  <option value="ceo">CEO</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={employment.hireDate}
                  onChange={e => setEmployment({ ...employment, hireDate: e.target.value })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>

              <div className="space-y-3">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                  Payment Type
                </label>
                <div className="flex gap-3">
                  {(['hourly', 'salary'] as const).map(type => (
                    <label
                      key={type}
                      className="flex items-center gap-2 flex-1 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="paymentType"
                        value={type}
                        checked={employment.paymentType === type}
                        onChange={() => setEmployment({ ...employment, paymentType: type })}
                        className="w-4 h-4"
                      />
                      <span className="text-slate-800 font-medium capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  {employment.paymentType === 'hourly' ? 'Hourly Rate ($)' : 'Annual Salary ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={employment.paymentType === 'hourly' ? employment.hourlyRate : employment.salary}
                  onChange={e => {
                    const value = parseFloat(e.target.value) || 0
                    if (employment.paymentType === 'hourly') {
                      setEmployment({ ...employment, hourlyRate: value })
                    } else {
                      setEmployment({ ...employment, salary: value })
                    }
                  }}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>
            </div>
          )}

          {/* Emergency Contact Tab */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  value={emergency.name}
                  onChange={e => setEmergency({ ...emergency, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Relationship
                </label>
                <input
                  type="text"
                  value={emergency.relationship}
                  onChange={e => setEmergency({ ...emergency, relationship: e.target.value })}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Phone
                </label>
                <input
                  type="tel"
                  value={emergency.phone}
                  onChange={e => setEmergency({ ...emergency, phone: e.target.value })}
                  placeholder="(604) 555-0000"
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                />
              </div>
            </div>
          )}

          {/* Qualifications Tab */}
          {activeTab === 'qualifications' && (
            <div className="space-y-4">
              {qualifications.map((qual, i) => (
                <div key={i} className="p-4 bg-bg-surface rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={qual.name}
                        onChange={e => {
                          const newQuals = [...qualifications]
                          newQuals[i].name = e.target.value
                          setQualifications(newQuals)
                        }}
                        placeholder="Certification name"
                        className="w-full bg-bg-base border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setQualifications(qualifications.filter((_, idx) => idx !== i))}
                      className="ml-2 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs mb-1 block">Expiry Date</label>
                    <input
                      type="date"
                      value={qual.expiryDate || ''}
                      onChange={e => {
                        const newQuals = [...qualifications]
                        newQuals[i].expiryDate = e.target.value
                        setQualifications(newQuals)
                      }}
                      className="w-full bg-bg-base border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                    />
                  </div>
                </div>
              ))}

              <div className="p-4 bg-brand-amber/5 border border-brand-amber/20 rounded-lg space-y-3">
                <input
                  type="text"
                  value={newQual.name}
                  onChange={e => setNewQual({ ...newQual, name: e.target.value })}
                  placeholder="Add new certification"
                  className="w-full bg-bg-base border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber"
                />
                <div>
                  <label className="text-slate-500 text-xs mb-1 block">Expiry Date</label>
                  <input
                    type="date"
                    value={newQual.expiryDate}
                    onChange={e => setNewQual({ ...newQual, expiryDate: e.target.value })}
                    className="w-full bg-bg-base border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newQual.name.trim()) {
                      setQualifications([...qualifications, newQual])
                      setNewQual({ name: '', expiryDate: '' })
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-brand-amber hover:bg-amber-500 text-slate-900 rounded-lg px-4 py-2 font-medium text-sm transition-colors"
                >
                  <Plus size={14} /> Add Certification
                </button>
              </div>
            </div>
          )}

          {/* Employment Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                Employment files management. File upload feature ready for implementation.
              </p>
              {employmentFiles.length === 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-slate-500 text-sm">No employment files added yet</p>
                </div>
              )}
            </div>
          )}

          {/* Leave Tab */}
          {activeTab === 'leave' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Annual Allowance (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={leave.annualAllowance}
                  onChange={e => setLeave({ ...leave, annualAllowance: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Used Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={leave.used}
                  onChange={e => setLeave({ ...leave, used: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Approved Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={leave.approved}
                  onChange={e => setLeave({ ...leave, approved: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Pending Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={leave.pending}
                  onChange={e => setLeave({ ...leave, pending: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-amber hover:bg-amber-500 disabled:opacity-50 rounded-lg px-4 py-2.5 text-slate-900 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
