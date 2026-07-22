import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { getTodayChecklist, getChecklistItems, getCrewChecklistSubmissions, submitChecklistItem } from '../../services/supabase'
import type { DailyChecklistData, ChecklistItemData, ChecklistSubmissionData } from '../../services/supabase'

interface Props {
  crewMemberId: number
  isLoading?: boolean
}

export function DailyChecklistCard({ crewMemberId, isLoading = false }: Props) {
  const [checklist, setChecklist] = useState<DailyChecklistData | null>(null)
  const [items, setItems] = useState<ChecklistItemData[]>([])
  const [submissions, setSubmissions] = useState<ChecklistSubmissionData[]>([])
  const [expandedIncomplete, setExpandedIncomplete] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(isLoading)

  useEffect(() => {
    fetchChecklist()
  }, [])

  const fetchChecklist = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const checklistData = await getTodayChecklist()
      setChecklist(checklistData)

      if (checklistData?.id) {
        const [itemsData, submissionsData] = await Promise.all([
          getChecklistItems(checklistData.id),
          getCrewChecklistSubmissions(crewMemberId, today),
        ])
        setItems(itemsData)
        setSubmissions(submissionsData)
      }
    } catch (err) {
      console.error('Error fetching checklist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleItem = async (item: ChecklistItemData) => {
    if (!item.id) return

    const today = new Date().toISOString().split('T')[0]
    const existing = submissions.find(s => s.checklist_item_id === item.id)
    const newIsComplete = !existing?.is_complete

    // If marking incomplete, expand to show reason field
    if (!newIsComplete) {
      setExpandedIncomplete(item.id)
    } else {
      setExpandedIncomplete(null)
    }

    setSaving(item.id)
    try {
      const result = await submitChecklistItem({
        checklist_item_id: item.id,
        crew_member_id: crewMemberId,
        checklist_date: today,
        is_complete: newIsComplete,
        reason_text: existing?.reason_text,
      })

      if (result) {
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.checklist_item_id !== item.id)
          return [...filtered, result]
        })
      }
    } catch (err) {
      console.error('Error toggling item:', err)
    } finally {
      setSaving(null)
    }
  }

  const handleReasonChange = (itemId: string, reason: string) => {
    setSubmissions(prev =>
      prev.map(s =>
        s.checklist_item_id === itemId
          ? { ...s, reason_text: reason }
          : s
      )
    )
  }

  const handleReasonBlur = async (item: ChecklistItemData, reason: string | undefined) => {
    if (!item.id) return

    const today = new Date().toISOString().split('T')[0]
    setSaving(item.id)
    try {
      const result = await submitChecklistItem({
        checklist_item_id: item.id,
        crew_member_id: crewMemberId,
        checklist_date: today,
        is_complete: false,
        reason_text: reason || undefined,
      })

      if (result) {
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.checklist_item_id !== item.id)
          return [...filtered, result]
        })
      }
    } catch (err) {
      console.error('Error saving reason:', err)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="card p-4 text-slate-500">Loading checklist...</div>

  if (!checklist || !items || items.length === 0) {
    return <div className="card p-4 text-slate-500">No checklist for today</div>
  }

  const itemsSorted = [...items].sort((a, b) => a.order_num - b.order_num)
  const completedCount = submissions.filter(s => s.is_complete).length

  return (
    <div className="card bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border border-emerald-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Daily Checklist</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {completedCount} of {itemsSorted.length} complete
          </p>
        </div>
        <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="space-y-2">
        {itemsSorted.map(item => {
          const submission = submissions.find(s => s.checklist_item_id === item.id)
          const isComplete = submission?.is_complete ?? false
          const isExpanded = expandedIncomplete === item.id
          const isSaving = saving === item.id

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-3 transition-all ${
                isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700'
                  : isExpanded
                    ? 'bg-red-50 dark:bg-red-900 border-red-300 dark:border-red-700'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isComplete}
                  onChange={() => handleToggleItem(item)}
                  disabled={isSaving}
                  className="mt-1 w-5 h-5 cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className={`font-semibold text-slate-800 dark:text-slate-100 ${isComplete ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</div>
                  )}

                  {/* Reason field for incomplete items */}
                  {isExpanded && !isComplete && (
                    <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-600">
                      <label className="text-sm font-semibold block mb-2 text-slate-700 dark:text-slate-200 flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        Reason for non-completion:
                      </label>
                      <textarea
                        className="w-full p-2 border border-red-300 dark:border-red-600 rounded text-sm bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                        placeholder="Enter reason..."
                        value={submission?.reason_text || ''}
                        onChange={(e) => item.id && handleReasonChange(item.id, e.target.value)}
                        onBlur={() => handleReasonBlur(item, submission?.reason_text)}
                        disabled={isSaving}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
