export function useGreeting(firstName: string) {
  const hour = new Date().getHours()
  let greeting = 'Good Morning'
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon'
  else if (hour >= 17) greeting = 'Good Evening'
  return `${greeting}, ${firstName}`
}
