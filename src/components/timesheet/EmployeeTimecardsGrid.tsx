import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, ChevronRight } from 'lucide-react'
import { getEmployeeTimeEntries } from '../../services/supabase'
import { useAppStore } from '../../store/appStore'
import type { TimesheetEntry } from '../../types'

interface TimeEntryData {
  id: string
  employee_name: string
  employee_id: string | number
  site_name: string
  clock_in_time: string
  clock_out_time?: string
  total_hours?: number
  regular_hours?: number
  overtime_hours?: number
  break_hours?: number
  shift_notes?: string
  adjusted_by_admin?: boolean
  admin_adjustment_note?: string
}

interface EmployeeTimecardsGridProps {
  employees: any[]
  selectedWeek: Date
}

interface EmployeeWeekData {
  employee: any
  timecards: any[]
  weekHours: number
  weekOvertime: number
}

// Helper to get current user's timecards from both localStorage and Supabase
async function getCurrentUserTimeEntries(
  userId: string | undefined,
  days = 30
): Promise<any[]> {
  if (!userId) return []

  try {
    // Get localStorage timecards for current user
    const storageKey = `richco-completed-timecards-${userId}`
    const stored = localStorage.getItem(storageKey)
    const localTimecards: TimesheetEntry[] = stored ? JSON.parse(stored) : []

    // Convert localStorage timecards to time_entries format for consistency
    const localEntries = localTimecards.map(tc => ({
      id: tc.id,
      employee_id: userId,
      employee_name: 'Current User',
      site_id: tc.siteId,
      site_name: tc.siteName,
      clock_in_time: new Date(tc.clockInTime).toISOString(),
      clock_out_time: tc.clockOutTime ? new Date(tc.clockOutTime).toISOString() : undefined,
      total_hours: tc.totalHours || 0,
      break_taken: tc.breakTaken,
      break_hours: (tc.breakMinutes || 0) / 60,
    }))

    // Also fetch from Supabase in case there's data there
    const supabaseEntries = await getEmployeeTimeEntries(userId.toString(), days)

    // Merge and deduplicate: prefer localStorage for today's entries
    const entryMap = new Map()
    supabaseEntries.forEach(e => entryMap.set(e.id, e))
    localEntries.forEach(e => entryMap.set(e.id, e)) // This overwrites Supabase with localStorage

    return Array.from(entryMap.values())
  } catch (err) {
    console.error('[EmployeeTimecardsGrid] Failed to get current user entries:', err)
    return []
  }
}

export function EmployeeTimecardsGrid({ employees, selectedWeek }: EmployeeTimecardsGridProps) {
  const { currentUserEmail, currentUserId } = useAppStore()
  const [employeeData, setEmployeeData] = useState<EmployeeWeekData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWeekData | null>(null)
  const [selectedTimecard, setSelectedTimecard] = useState<any | null>(null)

  // Calculate week boundaries (Saturday to Friday)
  const getWeekBoundaries = (date: Date) => {
    const d = new Date(date)
    const dayOfWeek = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate days to go BACK to reach Saturday
    // Saturday (6) = 0 days back
    // Sunday (0) = 1 day back
    // Monday (1) = 2 days back
    // etc.
    const daysBack = dayOfWeek === 6 ? 0 : (dayOfWeek === 0 ? 1 : dayOfWeek + 1)
    const weekStart = new Date(d.getTime() - daysBack * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Saturday to Friday = 6 days
    weekEnd.setHours(23, 59, 59, 999)

    return { weekStart, weekEnd }
  }

  useEffect(() => {
    const loadAllEmployeeTimecards = async () => {
      setIsLoading(true)
      try {
        const { weekStart, weekEnd } = getWeekBoundaries(selectedWeek)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekEndStr = weekEnd.toISOString().split('T')[0]

        // Check if selected week is in the future (end date is in the future)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isFutureWeek = weekStart > today

        console.log('[EmployeeTimecardsGrid] Week boundaries:', { weekStartStr, weekEndStr, isFutureWeek })

        const data: EmployeeWeekData[] = await Promise.all(
          employees.map(async (employee) => {
            try {
              const employeeId = employee.id || employee.employee_id
              const isCurrentUser = employee.email === currentUserEmail

              // For future weeks, don't fetch any entries
              if (isFutureWeek) {
                return {
                  employee,
                  timecards: [],
                  weekHours: 0,
                  weekOvertime: 0,
                }
              }

              // Use hybrid fetch for current user (localStorage + Supabase), Supabase-only for others
              const allEntries = isCurrentUser
                ? await getCurrentUserTimeEntries(currentUserId, 30)
                : await getEmployeeTimeEntries(employeeId.toString(), 30)

              // Filter to selected week (Sat-Fri)
              const weekEntries = allEntries.filter((entry: any) => {
                const entryDate = entry.clock_in_time?.split('T')[0]
                return entryDate >= weekStartStr && entryDate <= weekEndStr
              })

              // Calculate weekly totals
              const weekHours = weekEntries.reduce((sum: number, entry: any) => sum + (entry.total_hours || 0), 0)
              const weekOvertime = Math.max(0, weekHours - 40)

              return {
                employee,
                timecards: weekEntries,
                weekHours: parseFloat(weekHours.toFixed(2)),
                weekOvertime: parseFloat(weekOvertime.toFixed(2)),
              }
            } catch (err) {
              console.error(`Failed to load timecards for employee ${employee.name}:`, err)
              return {
                employee,
                timecards: [],
                weekHours: 0,
                weekOvertime: 0,
              }
            }
          })
        )

        setEmployeeData(data)
      } catch (err) {
        console.error('[EmployeeTimecardsGrid] Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadAllEmployeeTimecards()
  }, [employees, selectedWeek, currentUserEmail, currentUserId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading employee timecards...</div>
      </div>
    )
  }

  if (employeeData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">No employees found</div>
      </div>
    )
  }

  const getEmployeeName = (employee: any) => {
    // Try different name field combinations
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`
    }
    if (employee.name) return employee.name
    if (employee.employee_name) return employee.employee_name
    return 'Unknown'
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employeeData.map((data, idx) => (
          <motion.button
            key={data.employee.id || data.employee.employee_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedEmployee(data)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md hover:border-green-400 transition-all text-left"
          >
            {/* Employee header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600 p-4 border-b border-slate-200 dark:border-slate-600">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {getEmployeeName(data.employee)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {data.employee.email || data.employee.employee_email}
              </p>
            </div>

          {/* Week summary */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Hours</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {data.weekHours.toFixed(2)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Zap size={10} /> Overtime
                </p>
                <p className={`text-xl font-bold mt-1 ${
                  data.weekOvertime > 0
                    ? 'text-amber-500'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {data.weekOvertime.toFixed(2)}h
                </p>
              </div>
            </div>
          </div>

          {/* Daily timecards */}
          <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
            {data.timecards.length > 0 ? (
              data.timecards.map((tc) => (
                <div key={tc.id} className="text-xs">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(tc.clock_in_time).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(tc.total_hours || 0).toFixed(1)}h
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    {tc.site_name}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 dark:text-slate-500 text-xs py-2">No timecards this week</p>
            )}
          </div>
        </motion.button>
      ))}
      </div>

      {/* Employee Timecards Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEmployee(null)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600 p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {getEmployeeName(selectedEmployee.employee)}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {selectedEmployee.employee.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Week Summary */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Hours</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {selectedEmployee.weekHours.toFixed(2)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Overtime</p>
                    <p className={`text-2xl font-bold mt-2 ${
                      selectedEmployee.weekOvertime > 0 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {selectedEmployee.weekOvertime.toFixed(2)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Days</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {selectedEmployee.timecards.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timecards List */}
              <div className="p-6 space-y-3">
                {selectedEmployee.timecards.length > 0 ? (
                  selectedEmployee.timecards.map((tc) => (
                    <button
                      key={tc.id}
                      onClick={() => setSelectedTimecard(tc)}
                      className="w-full bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {new Date(tc.clock_in_time).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {tc.site_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                            {new Date(tc.clock_in_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} - {tc.clock_out_time ? new Date(tc.clock_out_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Ongoing'}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {(tc.total_hours || 0).toFixed(2)}h
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {tc.break_taken ? 'Break taken' : 'No break'}
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-slate-400" />
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    No timecards for this week
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Timecard Detail Modal */}
      <AnimatePresence>
        {selectedTimecard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTimecard(null)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600 p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Shift Details</h3>
                <button
                  onClick={() => setSelectedTimecard(null)}
                  className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Date</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {new Date(selectedTimecard.clock_in_time).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Site</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedTimecard.site_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Clock In</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {new Date(selectedTimecard.clock_in_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Clock Out</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {selectedTimecard.clock_out_time ? new Date(selectedTimecard.clock_out_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 'Ongoing'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Hours</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {(selectedTimecard.total_hours || 0).toFixed(2)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Break Hours</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {(selectedTimecard.break_hours || 0).toFixed(2)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Status</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                      Complete
                    </p>
                  </div>
                </div>

                {selectedTimecard.shift_notes && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Notes</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                      {selectedTimecard.shift_notes}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedTimecard(null)}
                  className="w-full mt-6 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-900 dark:text-white font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
