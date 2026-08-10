/**
 * Weekly Time Entries Reporting Service
 * Generates and formats email reports for time tracking
 */

import { getWeeklyTimeEntriesReport, WeeklyTimeEntryReport } from './supabase'
import { getDateRangeForWeek } from '../utils/dateUtils'

export interface EmailReport {
  to: string
  subject: string
  htmlBody: string
  textBody: string
}

/**
 * Generate last week's time entries report
 * (For Friday morning, this gets the previous Monday-Sunday)
 */
export async function generateWeeklyReports(): Promise<EmailReport[]> {
  try {
    const { startDate, endDate } = getDateRangeForWeek()

    console.log(`[Reporting] Generating reports for week: ${startDate} to ${endDate}`)

    const reports = await getWeeklyTimeEntriesReport(startDate, endDate)

    if (reports.length === 0) {
      console.warn('[Reporting] No time entries found for the week')
      return []
    }

    // Generate email for each employee
    const emailReports: EmailReport[] = reports
      .filter(r => r.employee_email) // Only send if email exists
      .map(report => ({
        to: report.employee_email,
        subject: `Weekly Time Entry Report - ${new Date(report.week_start).toLocaleDateString()} to ${new Date(report.week_end).toLocaleDateString()}`,
        htmlBody: formatReportAsHTML(report),
        textBody: formatReportAsText(report),
      }))

    return emailReports
  } catch (err) {
    console.error('[Reporting] Failed to generate weekly reports:', err)
    return []
  }
}

/**
 * Format report as HTML for email
 */
function formatReportAsHTML(report: WeeklyTimeEntryReport): string {
  const weekStart = new Date(report.week_start).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const weekEnd = new Date(report.week_end).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const rowsHTML = report.entries
    .map(entry => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; color: #1f2937;">${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
        <td style="padding: 12px; color: #1f2937;">${entry.site_name}</td>
        <td style="padding: 12px; text-align: center; color: #1f2937;">${entry.clock_in}</td>
        <td style="padding: 12px; text-align: center; color: #1f2937;">${entry.clock_out}</td>
        <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 500;">${entry.total_hours.toFixed(2)}h</td>
        <td style="padding: 12px; text-align: right; color: #059669;">${entry.regular_hours.toFixed(2)}h</td>
        <td style="padding: 12px; text-align: right; color: #dc2626;">${entry.overtime_hours.toFixed(2)}h</td>
      </tr>
    `)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #374151; line-height: 1.6; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; }
          .summary { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .summary-item { }
          .summary-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
          .summary-value { font-size: 24px; font-weight: 700; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; }
          th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; font-size: 13px; }
          .totals { background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 500; }
          .totals-row span:last-child { color: #059669; font-weight: 700; }
          .footer { text-align: center; font-size: 12px; color: #9ca3af; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Time Entry Report</h1>
            <p>${weekStart} – ${weekEnd}</p>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Days Worked</div>
              <div class="summary-value">${report.weekly_totals.days_worked}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Hours</div>
              <div class="summary-value">${report.weekly_totals.total_hours.toFixed(2)}h</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>In</th>
                <th>Out</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: right;">Regular</th>
                <th style="text-align: right;">Overtime</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Regular Hours:</span>
              <span>${report.weekly_totals.regular_hours.toFixed(2)}h</span>
            </div>
            <div class="totals-row">
              <span>Overtime Hours:</span>
              <span style="color: #dc2626;">${report.weekly_totals.overtime_hours.toFixed(2)}h</span>
            </div>
            <div class="totals-row">
              <span>Break Time:</span>
              <span>${report.weekly_totals.break_hours.toFixed(2)}h</span>
            </div>
            <div class="totals-row" style="border-top: 2px solid #d1d5db; padding-top: 12px; margin-top: 12px;">
              <span style="font-size: 16px;">Total Hours:</span>
              <span style="font-size: 16px; color: #059669;">${report.weekly_totals.total_hours.toFixed(2)}h</span>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated report generated by Richco Construction Field Operations App</p>
            <p>Report generated on ${new Date().toLocaleString('en-US')}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Format report as plain text
 */
function formatReportAsText(report: WeeklyTimeEntryReport): string {
  const weekStart = new Date(report.week_start).toLocaleDateString()
  const weekEnd = new Date(report.week_end).toLocaleDateString()

  let text = `WEEKLY TIME ENTRY REPORT\n`
  text += `${weekStart} – ${weekEnd}\n\n`

  text += `SUMMARY\n`
  text += `Days Worked: ${report.weekly_totals.days_worked}\n`
  text += `Total Hours: ${report.weekly_totals.total_hours.toFixed(2)}h\n\n`

  text += `DAILY ENTRIES\n`
  text += `─────────────────────────────────────────────────────────────\n`
  text += `Date | Site | In | Out | Total | Regular | Overtime\n`
  text += `─────────────────────────────────────────────────────────────\n`

  report.entries.forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    text += `${date} | ${entry.site_name} | ${entry.clock_in} | ${entry.clock_out} | ${entry.total_hours.toFixed(2)}h | ${entry.regular_hours.toFixed(2)}h | ${entry.overtime_hours.toFixed(2)}h\n`
  })

  text += `\nTOTALS\n`
  text += `Regular Hours: ${report.weekly_totals.regular_hours.toFixed(2)}h\n`
  text += `Overtime Hours: ${report.weekly_totals.overtime_hours.toFixed(2)}h\n`
  text += `Break Time: ${report.weekly_totals.break_hours.toFixed(2)}h\n`
  text += `Total Hours: ${report.weekly_totals.total_hours.toFixed(2)}h\n`

  return text
}
