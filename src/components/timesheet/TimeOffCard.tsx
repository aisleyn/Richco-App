import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, AlertCircle, CheckCircle, XCircle, Plus } from 'lucide-react'
import { getEmployeeRequests } from '../../services/timeoff'
import { useAppStore } from '../../store/appStore'
import { RequestTimeOffModal } from '../timeoff/RequestTimeOffModal'
import type { LeaveRequest } from '../../services/timeoff'

export function TimeOffCard() {
  const { currentUserEmail } = useAppStore()
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const requests = getEmployeeRequests(currentUserEmail)
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length

  const statusConfig = {
    pending: { icon: AlertCircle, color: 'text-amber-500' },
    approved: { icon: CheckCircle, color: 'text-emerald-500' },
    denied: { icon: XCircle, color: 'text-red-500' },
  }

  const leaveTypeLabels: Record<string, string> = {
    vacation: '🏖️ Vacation',
    sick: '🤒 Sick',
    personal: '👤 Personal',
    bereavement: '🕯️ Bereavement',
    other: '📋 Other',
  }

  const recentRequests = requests.slice(0, 3)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl border border-blue-500/20 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" />
            <h3 className="text-slate-900 font-semibold">Time Off</h3>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-xs font-semibold transition-colors"
          >
            <Plus size={14} /> Request
          </button>
        </div>

        {recentRequests.length === 0 ? (
          <p className="text-slate-600 text-sm">No time-off requests yet</p>
        ) : (
          <div className="space-y-2">
            {recentRequests.map(request => {
              const config = statusConfig[request.status]
              const Icon = config.icon
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-bg-surface rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon size={16} className={config.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 text-sm font-medium truncate">
                        {leaveTypeLabels[request.leaveType]}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(request.startDate).toLocaleDateString()} → {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-slate-800 font-bold text-sm">{request.totalDays}d</p>
                    <p className={`text-[10px] font-semibold capitalize ${config.color}`}>
                      {request.status}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary */}
        {requests.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-500/10 flex gap-3 text-xs">
            <div>
              <p className="text-slate-500">Pending</p>
              <p className="text-amber-500 font-bold">{pendingCount}</p>
            </div>
            <div>
              <p className="text-slate-500">Approved</p>
              <p className="text-emerald-500 font-bold">{approvedCount}</p>
            </div>
            <div>
              <p className="text-slate-500">Total</p>
              <p className="text-slate-900 font-bold">{requests.length}</p>
            </div>
          </div>
        )}
      </motion.div>

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
      </AnimatePresence>
    </>
  )
}
