import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Trash2, Eye, EyeOff } from 'lucide-react'
import { getSMSLog, clearSMSLog, sendCustomSMS } from '../../services/twilioService'

interface SMSLog {
  timestamp: string
  phoneNumber: string
  message: string
  success: boolean
  messageId?: string
}

export function SMSPanel() {
  const [logs, setLogs] = useState<SMSLog[]>([])
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLogs = () => {
      try {
        const data = getSMSLog()
        setLogs(data)
      } catch (err) {
        console.error('Failed to load SMS logs:', err)
      }
    }
    loadLogs()
  }, [showLogs])

  async function handleTestSMS(e: React.FormEvent) {
    e.preventDefault()
    if (!testPhone || !testMessage) {
      setError('Please enter phone number and message')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await sendCustomSMS(testPhone, testMessage)
      if (result.success) {
        setSuccess(`SMS sent successfully! (ID: ${result.messageId})`)
        setTestPhone('')
        setTestMessage('')
        setLogs(getSMSLog())
      } else {
        setError(`Failed to send: ${result.error}`)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  function handleClearLogs() {
    if (window.confirm('Clear all SMS logs? This cannot be undone.')) {
      clearSMSLog()
      setLogs([])
      setSuccess('SMS logs cleared')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">SMS Configuration & Testing</h3>

        {/* Environment check */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Twilio Setup:</strong> Make sure these environment variables are set:
          </p>
          <ul className="mt-2 text-sm space-y-1 text-blue-900 dark:text-blue-200 font-mono">
            <li>✓ VITE_TWILIO_ACCOUNT_SID</li>
            <li>✓ VITE_TWILIO_AUTH_TOKEN</li>
            <li>✓ VITE_TWILIO_PHONE_NUMBER</li>
          </ul>
        </div>

        {/* Test SMS Form */}
        <form onSubmit={handleTestSMS} className="space-y-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">Send Test SMS</h4>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number (E.164 format: +1234567890)
            </label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+14155552671"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              disabled={sending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Message ({testMessage.length}/160)
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value.slice(0, 160))}
              placeholder="Test message..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none"
              disabled={sending}
            />
          </div>

          <button
            type="submit"
            disabled={sending || !testPhone || !testMessage}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Test SMS'}
          </button>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm"
            >
              {success}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}
        </form>

        {/* Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Recent SMS Activity</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg transition-colors flex items-center gap-1"
              >
                {showLogs ? <EyeOff size={14} /> : <Eye size={14} />}
                {showLogs ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No SMS logs yet</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg text-xs border ${
                        log.success
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{log.phoneNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          log.success
                            ? 'bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-100'
                            : 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100'
                        }`}>
                          {log.success ? '✓ Sent' : '✗ Failed'}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-1 break-words">{log.message}</p>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-500">
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        {log.messageId && <span className="font-mono">ID: {log.messageId.slice(0, 8)}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
