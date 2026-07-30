import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { Shift } from '../../types'

interface Props {
  shift: Shift
  onStatusChange: (newStatus: Shift['status']) => void
  inline?: boolean
}

const STATUS_OPTIONS: Shift['status'][] = ['scheduled', 'in-progress', 'completed', 'cancelled']

const STATUS_COLORS: Record<Shift['status'], { bg: string; text: string; label: string }> = {
  'scheduled': { bg: 'bg-blue-500/15', text: 'text-blue-600', label: 'Scheduled' },
  'in-progress': { bg: 'bg-yellow-500/15', text: 'text-yellow-600', label: 'In Progress' },
  'completed': { bg: 'bg-green-500/15', text: 'text-green-600', label: 'Completed' },
  'cancelled': { bg: 'bg-red-500/15', text: 'text-red-600', label: 'Cancelled' },
}

export function ShiftStatusEditor({ shift, onStatusChange, inline = false }: Props) {
  const currentColor = STATUS_COLORS[shift.status]

  if (inline) {
    return (
      <select
        value={shift.status}
        onChange={(e) => onStatusChange(e.target.value as Shift['status'])}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          currentColor.bg
        } ${currentColor.text} border-current/30 hover:border-current/50 cursor-pointer`}
      >
        {STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>
            {STATUS_COLORS[status].label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div className="group relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
          currentColor.bg
        } ${currentColor.text} border border-current/30 hover:border-current/50`}
      >
        {currentColor.label}
        <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
      </motion.button>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full right-0 mt-1 bg-surface border border-border-light rounded-lg shadow-lg overflow-hidden z-10"
        >
          <div className="flex flex-col">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`px-4 py-2.5 text-xs font-semibold text-left whitespace-nowrap hover:bg-elevated transition-colors ${
                  status === shift.status ? STATUS_COLORS[status].bg + ' ' + STATUS_COLORS[status].text : 'text-secondary hover:text-primary'
                }`}
              >
                {STATUS_COLORS[status].label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
