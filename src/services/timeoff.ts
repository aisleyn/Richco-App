export type LeaveType = 'vacation' | 'sick' | 'personal' | 'bereavement' | 'other'
export type RequestStatus = 'pending' | 'approved' | 'denied'

export interface LeaveRequest {
  id: string
  employeeEmail: string
  employeeName: string
  leaveType: LeaveType
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  totalDays: number
  reason: string
  status: RequestStatus
  requestedDate: number // timestamp
  approvedBy?: string
  approvedDate?: number
  denialReason?: string
}

const LEAVE_REQUESTS_KEY = 'richco-leave-requests'


function getStoredRequests(): LeaveRequest[] {
  try {
    const stored = localStorage.getItem(LEAVE_REQUESTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRequests(requests: LeaveRequest[]) {
  try {
    localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(requests))
  } catch (err) {
    console.error('[Leave] Failed to save requests:', err)
  }
}

export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end date
  return Math.max(0, diffDays)
}

export function requestTimeOff(data: {
  employeeEmail: string
  employeeName: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
}, refreshAlerts?: () => void): LeaveRequest {
  const requests = getStoredRequests()
  const totalDays = calculateDays(data.startDate, data.endDate)

  const request: LeaveRequest = {
    id: `leave-${Date.now()}`,
    employeeEmail: data.employeeEmail,
    employeeName: data.employeeName,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    totalDays,
    reason: data.reason,
    status: 'pending',
    requestedDate: Date.now(),
  }

  requests.push(request)
  saveRequests(requests)
  console.log('[Leave] Request created:', request)

  // Create notification for admins and CEOs
  if (refreshAlerts) {
    createLeaveNotification(request, refreshAlerts)
  }

  return request
}

export function createLeaveNotification(request: LeaveRequest, refreshAlerts?: () => void) {
  try {
    if (refreshAlerts) {
      refreshAlerts()
    }
    console.log('[Alert] Leave request alert created')
  } catch (err) {
    console.error('[Alert] Failed to create leave request alert:', err)
  }
}

export function getEmployeeRequests(employeeEmail: string): LeaveRequest[] {
  return getStoredRequests().filter(r => r.employeeEmail.toLowerCase() === employeeEmail.toLowerCase())
}

export function getAllPendingRequests(): LeaveRequest[] {
  return getStoredRequests().filter(r => r.status === 'pending')
}

export function approveRequest(
  requestId: string,
  approvedBy: string
): LeaveRequest | null {
  const requests = getStoredRequests()
  const request = requests.find(r => r.id === requestId)

  if (!request) return null

  request.status = 'approved'
  request.approvedBy = approvedBy
  request.approvedDate = Date.now()
  saveRequests(requests)
  console.log('[Leave] Request approved:', request)
  return request
}

export function denyRequest(
  requestId: string,
  denialReason: string
): LeaveRequest | null {
  const requests = getStoredRequests()
  const request = requests.find(r => r.id === requestId)

  if (!request) return null

  request.status = 'denied'
  request.denialReason = denialReason
  saveRequests(requests)
  console.log('[Leave] Request denied:', request)
  return request
}

export function getRequestById(requestId: string): LeaveRequest | undefined {
  return getStoredRequests().find(r => r.id === requestId)
}

export function generateLeaveRequestAlerts(): Array<{
  id: string
  type: 'leave_request'
  title: string
  body: string
  timestamp: number
  read: boolean
  leaveRequestId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
}> {
  const pendingRequests = getAllPendingRequests()
  return pendingRequests.map(req => ({
    id: `alert-${req.id}`,
    type: 'leave_request' as const,
    title: `${req.employeeName} requested time off`,
    body: `${req.leaveType} leave from ${req.startDate} to ${req.endDate} (${req.totalDays} days)`,
    timestamp: req.requestedDate,
    read: false,
    leaveRequestId: req.id,
    employeeName: req.employeeName,
    leaveType: req.leaveType,
    startDate: req.startDate,
    endDate: req.endDate,
    totalDays: req.totalDays,
  }))
}
