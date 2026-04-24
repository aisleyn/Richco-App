import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, CheckCircle, XCircle, AlertCircle, Plus, Bell } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { RequestTimeOffModal } from '../components/timeoff/RequestTimeOffModal'
import { getEmployeeRequests, getAllPendingRequests } from '../services/timeoff'
import { isUserAdmin, getAllCrew } from '../services/crew'
import { ApproveLeaveModal } from '../components/timeoff/ApproveLeaveModal'
import type { LeaveRequest } from '../services/timeoff'

export function TimeOffScreen({ onNavigate: _onNavigate }: { onNavigate?: (s: string) => void }) {
  const { currentUserEmail, currentUserName } = useAppStore()
  const [tab, setTab] = useState<'my-requests' | 'pending'>('my-requests')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([])
  const [approveModal, setApproveModal] = useState<LeaveRequest | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const isAdminUser = isUserAdmin(currentUserEmail)
  const isCEO = getAllCrew().find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.role === 'ceo'
  const canApprove = isAdminUser || isCEO

  useEffect(() => {
    setRequests(getEmployeeRequests(currentUserEmail))
    if (canApprove) {
      setPendingRequests(getAllPendingRequests())
    }
  }, [currentUserEmail, refreshKey, canApprove])

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-500/15', text: 'text-amber-500', icon: AlertCircle },
    approved: { label: 'Approved', color: 'bg-emerald-500/15', text: 'text-emerald-500', icon: CheckCircle },
    denied: { label: 'Denied', color: 'bg-red-500/15', text: 'text-red-500', icon: XCircle },
  }

  const leaveTypeLabels: Record<string, string> = {
    vacation: '🏖️ Vacation Leave',
    sick: '🤒 Sick Leave',
    personal: '👤 Personal Leave',
    bereavement: '🕯️ Bereavement Leave',
    other: '📋 Other',
  }

  return (
    <AppLayout>
      <div className="pt-14">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-slate-800 text-2xl font-bold">Time Off</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your leave requests</p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-brand-amber hover:bg-amber-500 text-slate-900 rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Request
            </button>
          </div>
        </motion.div>

        {/* Main Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 mb-6 border-b border-slate-200"
        >
          <button
            onClick={() => setTab('my-requests')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              tab === 'my-requests'
                ? 'border-brand-amber text-brand-amber'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            My Requests
          </button>
          {canApprove && (
            <button
              onClick={() => setTab('pending')}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                tab === 'pending'
                  ? 'border-brand-amber text-brand-amber'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Bell size={16} />
              Pending Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-brand-amber text-slate-900 text-xs font-bold rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}
        </motion.div>

        {/* Status Filter (only for My Requests tab) */}
        {tab === 'my-requests' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex gap-2 mb-5 overflow-x-auto pb-2"
          >
            {(['pending', 'approved', 'denied'] as const).map(status => {
              const filtered = requests.filter(r => r.status === status)
              const config = statusConfig[status]
              return (
                <button
                  key={status}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    config.color
                  } ${config.text} border border-current/20 flex items-center gap-2`}
                >
                  {config.label} ({filtered.length})
                </button>
              )
            })}
          </motion.div>
        )}

        {/* Requests List */}
        {tab === 'my-requests' && requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-surface rounded-2xl border border-slate-200 p-8 text-center"
          >
            <Calendar size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">No leave requests yet</p>
            <p className="text-slate-500 text-sm mt-1">Click "Request" to submit a time-off request</p>
          </motion.div>
        )}

        {/* My Requests List */}
        {tab === 'my-requests' && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request, i) => {
              const config = statusConfig[request.status]
              const Icon = config.icon
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-bg-surface rounded-xl border border-slate-200 p-4 ${config.color}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon size={20} className={config.text} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900 font-semibold">
                            {leaveTypeLabels[request.leaveType]}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color} ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">{request.reason}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 pt-3 border-t border-slate-200">
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">From</p>
                      <p className="text-slate-800 font-medium text-sm mt-1">
                        {new Date(request.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">To</p>
                      <p className="text-slate-800 font-medium text-sm mt-1">
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Days</p>
                      <p className="text-slate-800 font-bold text-sm mt-1">{request.totalDays}</p>
                    </div>
                  </div>

                  {request.status === 'approved' && request.approvedBy && (
                    <div className="text-xs text-emerald-600 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      ✓ Approved by {request.approvedBy} on {new Date(request.approvedDate || 0).toLocaleDateString()}
                    </div>
                  )}

                  {request.status === 'denied' && request.denialReason && (
                    <div className="text-xs text-red-600 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="font-semibold mb-1">Denial Reason:</p>
                      <p>{request.denialReason}</p>
                    </div>
                  )}

                  {isAdminUser && request.status === 'pending' && (
                    <button
                      onClick={() => setApproveModal(request)}
                      className="w-full mt-3 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-600 text-xs font-semibold transition-colors"
                    >
                      Review Request
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Pending Requests (for Admins/CEOs) */}
        {tab === 'pending' && canApprove && (
          <>
            {pendingRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-surface rounded-2xl border border-slate-200 p-8 text-center"
              >
                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3" />
                <p className="text-slate-600 font-medium">All caught up!</p>
                <p className="text-slate-500 text-sm mt-1">No pending time-off requests</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request, i) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-bg-surface rounded-xl border-2 border-amber-500/30 p-4 bg-amber-500/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900 font-semibold">
                            {request.employeeName}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                            PENDING
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">{leaveTypeLabels[request.leaveType]}</p>
                        <p className="text-slate-600 text-sm mt-1">{request.reason}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">From</p>
                        <p className="text-slate-800 font-medium text-sm mt-1">
                          {new Date(request.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">To</p>
                        <p className="text-slate-800 font-medium text-sm mt-1">
                          {new Date(request.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Days</p>
                        <p className="text-slate-800 font-bold text-sm mt-1">{request.totalDays}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setApproveModal(request)}
                      className="w-full px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-600 text-xs font-semibold transition-colors"
                    >
                      Review & Approve/Deny
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showRequestModal && (
          <RequestTimeOffModal
            onClose={() => setShowRequestModal(false)}
            onRequestSubmitted={() => {
              setShowRequestModal(false)
              setRefreshKey(prev => prev + 1)
            }}
          />
        )}
        {approveModal && (
          <ApproveLeaveModal
            request={approveModal}
            onClose={() => setApproveModal(null)}
            onApprovalProcessed={() => {
              setApproveModal(null)
              setRefreshKey(prev => prev + 1)
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
