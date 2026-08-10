/**
 * Date utility functions
 */

/**
 * Get the date range for last week (Monday-Sunday)
 * Used for Friday morning reports to report on the week that just ended
 */
export function getDateRangeForWeek(): { startDate: string; endDate: string } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, 5 = Friday

  // Calculate Monday of last week
  let daysBack = dayOfWeek === 0 ? 8 : dayOfWeek + 1 // If today is Friday (5), go back 6 days to last Monday
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - daysBack)

  // Sunday of last week
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)

  const startDate = lastMonday.toISOString().split('T')[0]
  const endDate = new Date(lastSunday)
  endDate.setHours(23, 59, 59, 999)
  const endDateStr = endDate.toISOString()

  return { startDate, endDate: endDateStr }
}

/**
 * Get the date range for the current week
 */
export function getDateRangeForCurrentWeek(): { startDate: string; endDate: string } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday

  // Calculate Monday of this week
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysBack)
  monday.setHours(0, 0, 0, 0)

  // Sunday of this week
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const startDate = monday.toISOString().split('T')[0]
  const endDate = sunday.toISOString()

  return { startDate, endDate }
}
