import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, startOfWeek, format } from 'date-fns'

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
        <button
          onClick={handleCurrentWeek}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
        >
          Current Week
        </button>
      )}
    </div>
  )
}
