// Capitalize first letter of each word in a name
export function capitalizeName(name: string): string {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Get initials from a name
export function getInitials(name: string): string {
  if (!name) return 'A'
  const parts = name.split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

// Generate a consistent color from a name
export function getAvatarColor(name: string): string {
  const colors = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-emerald-500',
    'from-red-500 to-pink-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-blue-500',
    'from-cyan-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash = hash & hash
  }
  return colors[Math.abs(hash) % colors.length]
}
