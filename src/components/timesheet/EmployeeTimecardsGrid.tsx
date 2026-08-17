import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { getEmployeeTimeEntries } from '../../services/supabase'

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

export function EmployeeTimecardsGrid({ employees, selectedWeek }: EmployeeTimecardsGridProps) {
  const [employeeData, setEmployeeData] = useState<EmployeeWeekData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate week boundaries (Saturday to Friday)
  const getWeekBoundaries = (date: Date) => {
    const d = new Date(date)
    const dayOfWeek = d.getDay()
    const daysToSaturday = dayOfWeek === 6 ? 0 : (dayOfWeek === 0 ? -1 : (7 - dayOfWeek - 1))
    const weekStart = new Date(d.getTime() + daysToSaturday * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
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

        const data: EmployeeWeekData[] = await Promise.all(
          employees.map(async (employee) => {
            try {
              const employeeId = employee.id || employee.employee_id
              const allEntries = await getEmployeeTimeEntries(employeeId.toString(), 30)

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
  }, [employees, selectedWeek])

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employeeData.map((data, idx) => (
        <motion.div
          key={data.employee.id || data.employee.employee_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Employee header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600 p-4 border-b border-slate-200 dark:border-slate-600">
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {data.employee.name || data.employee.employee_name || 'Unknown'}
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
        </motion.div>
      ))}
    </div>
  )
}
