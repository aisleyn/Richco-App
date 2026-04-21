import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

export function ThemeToggle() {
  const { isDark, setIsDark } = useDarkMode()

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg bg-bg-elevated dark:bg-bg-elevated-dark text-text-primary dark:text-text-secondary hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
