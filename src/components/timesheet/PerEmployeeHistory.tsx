import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { WeekNavigator } from './WeekNavigator'
import { TimeCardAdjustmentModal } from './TimeCardAdjustmentModal'
import { getEmployeeTimeEntries, adjustTimeEntryByAdmin } from '../../services/supabase'
import { useAppStore } from '../../store/appStore'

interface PerEmployeeHistoryProps {
  employees: any[]
  selectedWeek: Date
  onWeekChange: (date: Date) => void
}

interface TimeEntry {
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

export function PerEmployeeHistory({
  employees,
  selectedWeek,
  onWeekChange,
}: PerEmployeeHistoryProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [timecards, setTimecards] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTimecard, setSelectedTimecard] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { currentUserId } = useAppStore()

  // Load employee's timecards for selected week
  useEffect(() => {
    if (!selectedEmployee) return

    const loadTimecards = async () => {
      setIsLoading(true)
      try {
        const employeeId = selectedEmployee.id || selectedEmployee.employee_id
        const weekStart = new Date(selectedWeek)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Sunday of that week

        const entries = await getEmployeeTimeEntries(employeeId.toString(), 30)

        // Filter to selected week
        const weekEntries = entries.filter((entry: any) => {
          const entryDate = new Date(entry.clock_in_time)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 7)
          return entryDate >= weekStart && entryDate < weekEnd
        })

        setTimecards(weekEntries)
      } catch (err) {
        console.error('[PerEmployeeHistory] Failed to load timecards:', err)
        setTimecards([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTimecards()
  }, [selectedEmployee, selectedWeek])

  const handleAdjustment = async (adjustedHours: number, note: string) => {
    if (!selectedTimecard || !currentUserId) return

    setIsSaving(true)
    try {
      const success = await adjustTimeEntryByAdmin(
        selectedTimecard.id,
        adjustedHours,
        note,
        currentUserId.toString()
      )

      if (success) {
        // Reload timecards
        const updated = timecards.map((tc) =>
          tc.id === selectedTimecard.id
            ? {
                ...tc,
                total_hours: adjustedHours,
                adjusted_by_admin: true,
                admin_adjustment_note: note,
              }
            : tc
        )
        setTimecards(updated)
        setSelectedTimecard(null)
      }
    } catch (err) {
      console.error('[PerEmployeeHistory] Adjustment failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        Per-Employee History
      </h3>

      {/* Employee Selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
        >
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              EMPLOYEE
            </p>
            <p className="text-slate-900 dark:text-white font-semibold">
              {selectedEmployee?.firstName
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName || ''}`
                : selectedEmployee?.name || 'Select Employee'}
            </p>
          </div>
          <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={20} className="text-slate-400" />
          </motion.div>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {employees.map((emp) => {
              const empName = emp.firstName
                ? `${emp.firstName} ${emp.lastName || ''}`
                : emp.name || 'Unknown'
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp)
                    setDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                    selectedEmployee?.id === emp.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                      : ''
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-white">{empName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{emp.email}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Week Navigator */}
      <WeekNavigator
        selectedDate={selectedWeek}
        onWeekChange={onWeekChange}
        showCurrentWeekButton={true}
      />

      {/* Timecards */}
      {isLoading ? (
        <div className="p-6 text-center text-slate-500">Loading timecards...</div>
      ) : timecards.length === 0 ? (
        <div className="p-6 text-center text-slate-500">
          No timecards for {selectedEmployee?.name} this week
        </div>
      ) : (
        <div className="space-y-3">
          {timecards.map((tc, idx) => (
            <motion.button
              key={tc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedTimecard(tc)}
              className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(tc.clock_in_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tc.site_name}</p>
                  {tc.adjusted_by_admin && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      ✓ Adjusted by admin: {tc.admin_adjustment_note}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {tc.total_hours?.toFixed(2)}h
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    (Overtime calculated weekly)
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Adjustment Modal */}
      {selectedTimecard && (
        <TimeCardAdjustmentModal
          timeEntry={selectedTimecard}
          onSave={handleAdjustment}
          onCancel={() => setSelectedTimecard(null)}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
