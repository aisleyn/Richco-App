/**
 * Twilio SMS Service
 * Sends SMS notifications for clock in/out and other events
 */

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER

interface SMSRequest {
  to: string // Phone number to send to
  message: string
}

interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
  timestamp: number
}

/**
 * Send SMS via Twilio
 * Note: This requires a backend endpoint since Twilio API keys can't be exposed in frontend
 */
async function sendSMSViaBackend(request: SMSRequest): Promise<SMSResponse> {
  const timestamp = Date.now()

  // If no Twilio credentials, log and return success (graceful degradation)
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] Twilio not configured. SMS would have been sent to:', request.to, request.message)
    return {
      success: true, // Don't break the app if SMS isn't configured
      error: 'SMS service not configured',
      timestamp,
    }
  }

  try {
    // Build Basic Auth header for Twilio API
    const authString = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
    const encodedAuth = btoa(authString)

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: request.to,
          Body: request.message,
        }).toString(),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[SMS] Twilio error:', errorData)
      return {
        success: false,
        error: errorData.message || 'Failed to send SMS',
        timestamp,
      }
    }

    const data = await response.json()
    console.log('[SMS] Message sent:', data.sid)

    return {
      success: true,
      messageId: data.sid,
      timestamp,
    }
  } catch (err) {
    console.error('[SMS] Failed to send SMS:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp,
    }
  }
}

/**
 * Log SMS event to localStorage for tracking
 */
function logSMSEvent(phoneNumber: string, message: string, success: boolean, messageId?: string) {
  try {
    const key = 'richco-sms-log'
    const log = JSON.parse(localStorage.getItem(key) || '[]')
    log.push({
      timestamp: new Date().toISOString(),
      phoneNumber,
      message: message.substring(0, 100), // First 100 chars
      success,
      messageId,
    })
    // Keep only last 100 SMS logs
    if (log.length > 100) {
      log.shift()
    }
    localStorage.setItem(key, JSON.stringify(log))
  } catch (err) {
    console.error('[SMS] Failed to log event:', err)
  }
}

export async function sendClockInSMS(
  phoneNumber: string | undefined,
  employeeName: string,
  siteName: string,
  clockInTime: string
): Promise<SMSResponse> {
  if (!phoneNumber) {
    console.warn('[SMS] No phone number for employee:', employeeName)
    return {
      success: false,
      error: 'No phone number on file',
      timestamp: Date.now(),
    }
  }

  // Format time (extract HH:MM from ISO string)
  const timeOnly = clockInTime.split('T')[1]?.slice(0, 5) || clockInTime

  const message = `Hi ${employeeName.split(' ')[0]}, you've clocked in at ${siteName} at ${timeOnly}. Safe travels!`

  const response = await sendSMSViaBackend({
    to: phoneNumber,
    message,
  })

  logSMSEvent(phoneNumber, message, response.success, response.messageId)
  return response
}

export async function sendClockOutSMS(
  phoneNumber: string | undefined,
  employeeName: string,
  siteName: string,
  totalHours: number,
  clockOutTime: string
): Promise<SMSResponse> {
  if (!phoneNumber) {
    console.warn('[SMS] No phone number for employee:', employeeName)
    return {
      success: false,
      error: 'No phone number on file',
      timestamp: Date.now(),
    }
  }

  const timeOnly = clockOutTime.split('T')[1]?.slice(0, 5) || clockOutTime
  const hoursText = totalHours.toFixed(2)

  const message = `Hi ${employeeName.split(' ')[0]}, you've clocked out from ${siteName} at ${timeOnly}. Total hours today: ${hoursText}h.`

  const response = await sendSMSViaBackend({
    to: phoneNumber,
    message,
  })

  logSMSEvent(phoneNumber, message, response.success, response.messageId)
  return response
}

export async function sendShiftReminderSMS(
  phoneNumber: string | undefined,
  employeeName: string,
  siteName: string,
  shiftStartTime: string
): Promise<SMSResponse> {
  if (!phoneNumber) {
    return {
      success: false,
      error: 'No phone number on file',
      timestamp: Date.now(),
    }
  }

  const timeOnly = shiftStartTime.split('T')[1]?.slice(0, 5) || shiftStartTime
  const message = `Hi ${employeeName.split(' ')[0]}, reminder: your shift at ${siteName} starts at ${timeOnly}.`

  const response = await sendSMSViaBackend({
    to: phoneNumber,
    message,
  })

  logSMSEvent(phoneNumber, message, response.success, response.messageId)
  return response
}

export async function sendCustomSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResponse> {
  if (!phoneNumber) {
    return {
      success: false,
      error: 'No phone number provided',
      timestamp: Date.now(),
    }
  }

  const response = await sendSMSViaBackend({ to: phoneNumber, message })
  logSMSEvent(phoneNumber, message, response.success, response.messageId)
  return response
}

/**
 * Get SMS log for debugging/analytics
 */
export function getSMSLog(): Array<any> {
  try {
    return JSON.parse(localStorage.getItem('richco-sms-log') || '[]')
  } catch {
    return []
  }
}

/**
 * Clear SMS log
 */
export function clearSMSLog() {
  try {
    localStorage.removeItem('richco-sms-log')
    console.log('[SMS] Log cleared')
  } catch (err) {
    console.error('[SMS] Failed to clear log:', err)
  }
}
