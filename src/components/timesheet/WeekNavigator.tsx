import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { addDays, startOfWeek, format, getDaysInMonth } from 'date-fns'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WeekNavigatorProps {
  selectedDate: Date
  onWeekChange: (date: Date) => void
  showCurrentWeekButton?: boolean
}

export function WeekNavigator({
  selectedDate,
  onWeekChange,
  showCurrentWeekButton = true,
}: WeekNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date(selectedDate))

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }) // Sunday
  const weekEnd = addDays(weekStart, 6)

  const handlePrevWeek = () => {
    onWeekChange(addDays(selectedDate, -7))
  }

  const handleNextWeek = () => {
    onWeekChange(addDays(selectedDate, 7))
  }

  const handleCurrentWeek = () => {
    onWeekChange(new Date())
  }

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
  }

  const handleSelectDay = (day: number) => {
    const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
    onWeekChange(selected)
    setShowCalendar(false)
  }

  // Generate calendar days
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const lastDay = getDaysInMonth(calendarMonth)
  const startingDayOfWeek = firstDay.getDay()
  const daysArray = Array.from({ length: lastDay }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: startingDayOfWeek }, () => null)

  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevWeek}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Previous week"
        >
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
        </button>

        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg min-w-[160px] text-center">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{weekLabel}</span>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Next week"
        >
          <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {showCurrentWeekButton && (
        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleCurrentWeek}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
          >
            Current Week
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Pick a date"
          >
            <Calendar size={20} className="text-slate-600 dark:text-slate-400" />
          </button>

          {/* Month/Day Calendar Picker */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg shadow-xl z-50 p-4 w-72"
              >
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                  </button>
                  <h3 className="font-bold text-slate-900 dark:text-white text-center flex-1">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded ml-2 transition-colors"
                  >
                    <X size={18} className="text-slate-600 dark:text-slate-400" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-8" />
                  ))}
                  {daysArray.map((day) => {
                    const isSelected =
                      day === selectedDate.getDate() &&
                      calendarMonth.getMonth() === selectedDate.getMonth() &&
                      calendarMonth.getFullYear() === selectedDate.getFullYear()

                    return (
                      <button
                        key={day}
                        onClick={() => handleSelectDay(day)}
                        className={`h-8 rounded text-sm font-semibold transition-colors ${
                          isSelected
                            ? 'bg-green-600 text-white'
                            : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
