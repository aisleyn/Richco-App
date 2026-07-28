export function useGreeting(firstName: string) {
  const hour = new Date().getHours()
  let greeting = 'Good Morning'
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon'
  else if (hour >= 17) greeting = 'Good Evening'
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
  return `${greeting}, ${capitalizedName}`
}
