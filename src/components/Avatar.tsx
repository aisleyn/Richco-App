import { getInitials, getAvatarColor, capitalizeName } from '../utils/formatting'

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

export function Avatar({ name, size = 'md', showName = false }: Props) {
  const initials = getInitials(name)
  const color = getAvatarColor(name)
  const capitalizedName = capitalizeName(name)

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0 ${sizeClasses[size]}`}>
        {initials}
      </div>
      {showName && <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{capitalizedName}</span>}
    </div>
  )
}
