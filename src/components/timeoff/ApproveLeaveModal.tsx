import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader, CheckCircle, XCircle } from 'lucide-react'
import { approveRequest, denyRequest } from '../../services/timeoff'
import { useAppStore } from '../../store/appStore'
import type { LeaveRequest } from '../../services/timeoff'

interface Props {
  request: LeaveRequest
  onClose: () => void
  onApprovalProcessed: () => void
}

export function ApproveLeaveModal({ request, onClose, onApprovalProcessed }: Props) {
  const { currentUserName } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny' | null>(null)
  const [denialReason, setDenialReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setError(null)
    setLoading(true)

    try {
      approveRequest(request.id, currentUserName)
      onApprovalProcessed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeny() {
    if (!denialReason.trim()) {
      setError('Please provide a reason for denial')
      return
    }

    setError(null)
    setLoading(true)

    try {
      denyRequest(request.id, denialReason.trim())
      onApprovalProcessed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny request')
    } finally {
      setLoading(false)
    }
  }

  const leaveTypeLabels: Record<string, string> = {
    vacation: '🏖️ Vacation Leave',
    sick: '🤒 Sick Leave',
    personal: '👤 Personal Leave',
    bereavement: '🕯️ Bereavement Leave',
    other: '📋 Other',
  }

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
        className="w-full sm:w-full sm:max-w-md bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold">Review Leave Request</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Request Details */}
        <div className="space-y-4 mb-6 p-4 bg-bg-surface rounded-lg border border-slate-200">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Employee</p>
            <p className="text-slate-900 font-semibold mt-1">{request.employeeName}</p>
            <p className="text-slate-600 text-xs mt-0.5">{request.employeeEmail}</p>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Type of Leave</p>
            <p className="text-slate-900 font-semibold mt-1">{leaveTypeLabels[request.leaveType]}</p>
          </div>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-3">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">From</p>
              <p className="text-slate-900 font-semibold mt-1">
                {new Date(request.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">To</p>
              <p className="text-slate-900 font-semibold mt-1">
                {new Date(request.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Days</p>
              <p className="text-slate-900 font-bold text-lg mt-1">{request.totalDays}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Reason</p>
            <p className="text-slate-800 mt-1">{request.reason}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {action === null && (
          <div className="space-y-3">
            <button
              onClick={() => setAction('approve')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-500 font-semibold transition-colors disabled:opacity-50"
            >
              <CheckCircle size={18} /> Approve Request
            </button>
            <button
              onClick={() => setAction('deny')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg px-4 py-3 text-red-500 font-semibold transition-colors disabled:opacity-50"
            >
              <XCircle size={18} /> Deny Request
            </button>
          </div>
        )}

        {action === 'approve' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-600 font-semibold text-sm">Approve this leave request?</p>
              <p className="text-emerald-600 text-xs mt-1 opacity-75">
                {request.employeeName} will be notified of the approval.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg px-4 py-2.5 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                Approve
              </button>
            </div>
          </div>
        )}

        {action === 'deny' && (
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                Reason for Denial
              </label>
              <textarea
                value={denialReason}
                onChange={e => setDenialReason(e.target.value)}
                placeholder="Explain why this request is being denied..."
                rows={3}
                className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={loading || !denialReason.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg px-4 py-2.5 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                Deny
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
