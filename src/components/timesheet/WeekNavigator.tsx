import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { addDays, startOfWeek, format } from 'date-fns'
import { useState, useRef } from 'react'

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
  const dateInputRef = useRef<HTMLInputElement>(null)

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

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value
    if (dateStr) {
      onWeekChange(new Date(dateStr))
      setShowCalendar(false)
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleCurrentWeek}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
          >
            Current Week
          </button>
          <button
            onClick={() => {
              setShowCalendar(!showCalendar)
              if (!showCalendar) {
                setTimeout(() => dateInputRef.current?.click(), 0)
              }
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Pick a date"
          >
            <Calendar size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
